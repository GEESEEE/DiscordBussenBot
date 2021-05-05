import {
    Collector,
    Guild,
    Message,
    MessageCollector,
    MessageEmbed,
    MessageReaction,
    ReactionCollector,
    TextChannel,
    User,
} from 'discord.js'
import { isArray } from 'util'

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
import { CollectorPlayerLeftError, GameEndedError } from './Errors'

export abstract class Game {
    name: string

    deck: Deck
    channel: TextChannel
    collector: MessageCollector | ReactionCollector

    players: Array<User>
    hasStarted: boolean

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
        this.collector?.stop(`endgame`)

        throw new GameEndedError(`${this.name} has ended`)
    }

    hasEnded() {
        if (!this.hasPlayers()) {
            this.endGame()
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
        const { collected, collector } = getSingleReaction(
            player,
            sentMessage,
            options,
        )
        this.collector = collector
        collector.player = player

        const col = await Promise.all([
            collected,
            reactOptions(sentMessage, options),
        ])

        return col[0]
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
        player?,
    ): Promise<number> {
        if (!player) {
            player = this.leader
        }
        const collected = new Promise((resolve, reject) => {
            collector.on(`collect`, async (reaction, user) => {
                const reactEmoji = reaction.emoji.name

                if (user.equals(player)) {
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

            collector.on(`end`, (collected, reason) => {
                console.log(`reason`, reason)
                if (reason === `removeplayer`) {
                    reject(new CollectorPlayerLeftError(``))
                }
            })
        })
        this.collector = collector
        collector.player = player

        const col = await Promise.all([
            collected,
            reactOptions(sentMessage, sizeOptions),
        ])

        return col[0] as number
    }

    async removePlayer(player) {
        if (this.isPlayer(player)) {
            if (this.collector && player.equals(this.collector.player)) {
                this.collector?.stop(`removeplayer`)
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

            if (this.hasStarted) {
                await this.channel.send(embed)
            }
        }
    }

    async play() {
        this.hasStarted = true
        try {
            await this.game()
        } catch (err) {
            if (!(err instanceof GameEndedError)) {
                throw err
            }
        }

        const embed = new MessageEmbed().setTitle(`${this.name} has finished`)
        await this.channel.send(embed)
        const server: Guild = this.channel.guild
        server.currentGame = null
    }

    abstract game(): void
    abstract onRemovePlayer(player): string

    //endregion

    //region User Input Error Handling

    handleError(err) {
        if (err instanceof CollectorPlayerLeftError) {
            this.hasEnded()
        } else {
            throw err
        }
    }

    // This will continually ask the given player for a response using getResponse
    // if the player leaves during this, it returns undefined
    async loopForResponse(func) {
        let succes
        let val
        while (!succes && this.hasPlayers()) {
            try {
                val = await func.call(this)
                succes = true
            } catch (err) {
                this.handleError(err)
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
                    this.hasEnded()
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
                this.handleError(err)
            }
        }
    }

    async ask(func) {
        if (this.hasPlayers()) {
            try {
                return func.call(this)
            } catch (err) {
                this.handleError(err)
            }
        }
    }



    //endregion
}
