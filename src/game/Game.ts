import {
    Collector,
    Message,
    MessageCollector,
    MessageEmbed,
    MessageReaction,
    ReactionCollector,
    TextChannel,
    User,
} from 'discord.js'

import { ReactionEmojis } from '../utils/Consts'
import { Emoji } from '../utils/Emoji'
import {
    createChecker,
    getFilter,
    getPrompt,
    getSingleReaction,
    inElementOf,
    reactOptions,
    removeReaction,
} from '../utils/Utils'
import { Deck } from './Deck'
import { CollectorPlayerLeftError, GameEnded } from './Errors'

export abstract class Game {
    name: string

    deck: Deck
    channel: TextChannel
    collector: MessageCollector | ReactionCollector

    players: Array<User>
    hasStarted: boolean
    hasEnded: boolean

    protected constructor(name, leader, channel) {
        this.name = name
        this.players = []
        this.hasStarted = false
        this.channel = channel
        this.addPlayer(leader)
    }

    //region Simple Functions
    isLeader(player) {
        if (this.hasPlayers()) {
            return this.players[0].equals(player)
        } else {
            return null
        }
    }

    get leader() {
        return this.players[0]
    }

    addPlayer(player) {
        if (!this.isPlayer(player)) {
            player.removeAllCards()
            this.players.push(player)
        }
    }

    isPlayer(player) {
        return this.players.includes(player)
    }

    hasPlayers() {
        return this.players.length > 0
    }

    endGame() {
        this.hasEnded = true
        this.collector?.stop()
    }

    isEnded() {
        if (this.hasEnded) {
            throw new GameEnded(`${this.name} has ended`)
        }
    }

    noOneHasCards() {
        for (const player of this.players) {
            if (player.hasCards()) {
                return false
            }
        }
        return true
    }

    //endregion

    //region Important Functions

    // if numeric is true, responseOptions should be 'x,y' as a string with x and y as numbers, also supports negative numbers
    async getResponse(player, string, responseOptions, numeric = false) {
        if (typeof responseOptions === 'string') {
            responseOptions = [responseOptions]
        }

        const fuse = createChecker(responseOptions, numeric)
        if (numeric) {
            responseOptions[0] = responseOptions[0].replace(`,`, `-`)
        }

        const prompt = `${player}, ${string} (${responseOptions.join('/')})`
        await this.channel.send(prompt)

        const { collected, collector } = getPrompt(
            this.channel,
            getFilter(player, fuse),
        )
        this.collector = collector
        collector.player = player
        const res = await collected

        if (!numeric) {
            return fuse.search(res.content)[0].item
        } else {
            return parseInt(res.content)
        }
    }

    async getSingleReaction(
        player,
        sentMessage,
        options,
    ): Promise<MessageReaction> {
        let col
        try {
            const { collected, collector } = getSingleReaction(
                player,
                sentMessage,
                options,
            )
            this.collector = collector
            collector.player = player
            col = collected

            await reactOptions(sentMessage, options)
        } catch (err) {
            if (err instanceof CollectorPlayerLeftError) {
                this.isEnded()
            } else {
                throw err
            }
        }

        return col
    }

    incSize(min, max, current, toAdd) {
        const newVal = current + toAdd
        if (newVal > max) {
            return max
        } else if (newVal < min) {
            return min
        } else {
            return newVal
        }
    }

    async waitForValue(
        collector,
        val,
        min,
        max,
        sentMessage,
        embed,
        field,
        sizeOptions,
    ): Promise<number> {
        let promise
        try {
            promise = new Promise((resolve, _) => {
                collector.on(`collect`, async (reaction, user) => {
                    const reactEmoji = reaction.emoji.name

                    if (user.equals(this.leader)) {
                        if (Emoji.PLAY.includes(reactEmoji)) {
                            collector.stop()
                            resolve(val)
                        } else {
                            if (Emoji.HIGHER.includes(reactEmoji)) {
                                val = this.incSize(min, max, val, 1)
                            } else if (Emoji.HIGHER2.includes(reactEmoji)) {
                                val = this.incSize(min, max, val, 3)
                            } else if (Emoji.LOWER.includes(reactEmoji)) {
                                val = this.incSize(min, max, val, -1)
                            } else if (Emoji.LOWER2.includes(reactEmoji)) {
                                val = this.incSize(min, max, val, -3)
                            }
                            field.value = `${val}`
                            await sentMessage.edit(embed)
                        }
                        await removeReaction(reaction, user)
                    }
                })
            })
            await reactOptions(sentMessage, sizeOptions)
        } catch (err) {
            if (err instanceof CollectorPlayerLeftError) {
                this.isEnded()
            } else {
                throw err
            }
        }

        return promise
    }

    async removePlayer(player) {
        if (this.isPlayer(player)) {
            if (this.collector && player.equals(this.collector.player)) {
                this.collector.stop()
            }

            const title = `${player.username} decided to be a little bitch and quit ${this.name}\n`
            let message = ``

            const playerIndex = this.players.indexOf(player)
            if (playerIndex > -1) {
                this.players.splice(playerIndex, 1)
            }

            if (playerIndex === 0 && this.hasPlayers()) {
                message += `${this.leader} is the new leader!\n`
            }

            this.deck.addCards(player.cards)
            player.removeAllCards()

            const additionalMessage = this.onRemovePlayer(player)

            if (additionalMessage) {
                message += additionalMessage
            }

            const embed = new MessageEmbed().setTitle(title)
            if (message.length > 0) {
                embed.setDescription(message)
            }

            await this.channel.send(embed)
            if (!this.hasPlayers()) {
                return this.endGame()
            }
        }
    }

    async play() {
        this.hasStarted = true
        try {
            await this.game()
        } catch (err) {
            if (
                !(
                    err instanceof GameEnded ||
                    err instanceof CollectorPlayerLeftError
                )
            ) {
                throw err
            }
        }

        await this.channel.send(`${this.name} has finished`)
        const server: any = this.channel.guild
        server.currentGame = null
    }

    abstract game(): void
    abstract onRemovePlayer(player): string

    //endregion

    //region User Input Error Handling

    // This will continually ask the given player for a response using getResponse
    // if the player leaves during this, it returns undefined
    async loopForResponse(player, string, responseOptions, numeric = false) {
        let succes
        let val
        while (!succes && this.isPlayer(player)) {
            try {
                val = await this.getResponse(
                    player,
                    string,
                    responseOptions,
                    numeric,
                )
                succes = true
            } catch (err) {
                if (!(err instanceof CollectorPlayerLeftError)) {
                    throw err
                }
            }
        }

        return val
    }

    async askAllPlayers(func) {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
                await func.call(this, player)
            } catch (err) {
                if (err instanceof CollectorPlayerLeftError) {
                    this.isEnded()
                    i--
                } else {
                    throw err
                }
            }
        }
    }

    async askWhile(boolean, func) {
        while (this.hasPlayers() && boolean()) {
            try {
                await func.call(this)
            } catch (err) {
                if (err instanceof CollectorPlayerLeftError) {
                    this.isEnded()
                } else {
                    throw err
                }
            }
        }
    }

    async ask(func) {
        if (this.hasPlayers()) {
            try {
                await func.call(this)
            } catch (err) {
                if (err instanceof CollectorPlayerLeftError) {
                    this.isEnded()
                } else {
                    throw err
                }
            }
        }
    }

    //endregion
}
