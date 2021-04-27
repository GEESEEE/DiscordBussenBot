import {
    Message,
    MessageCollector,
    MessageEmbed,
    MessageReaction,
    TextChannel,
} from 'discord.js'

import { ReactionEmojis } from '../utils/Consts'
import { Emoji } from '../utils/Emoji'
import {
    createChecker,
    getFilter,
    getPrompt,
    getSingleReaction,
    inElementOf,
} from '../utils/Utils'
import { Deck } from './Deck'
import { CollectorPlayerLeftError, GameEnded } from './Errors'

export abstract class Game {
    name: string

    deck: Deck
    channel: TextChannel
    collector: MessageCollector & { player: any }

    players: Array<any>
    lastMessage: Message
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
        console.log(
            `player`,
            player.username,
            `string`,
            string,
            `responseOptions`,
            responseOptions,
        )
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
        console.log(res)
        if (!numeric) {
            return fuse.search(res.content)[0].item
        } else {
            return parseInt(res.content)
        }
    }

    async getSingleReaction(
        player,
        embed,
        options,
    ): Promise<{ reaction: any; sentMessage: Message }> {
        const sentMessage = await this.channel.send({ embed: embed })

        const { collected, collector } = await getSingleReaction(
            player,
            sentMessage,
            options,
        )

        for (const option of options) {
            await sentMessage.react(option)
        }

        this.collector = collector
        collector.player = player
        this.lastMessage = sentMessage
        const reaction = await collected
        return { reaction, sentMessage }
    }

    async removePlayer(player) {
        if (this.isPlayer(player)) {
            let fromCollector = false
            if (this.collector && player.equals(this.collector.player)) {
                this.collector.stop()
                fromCollector = true
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

            if (fromCollector) {
                await this.lastMessage.edit(embed)
            } else {
                await this.channel.send(embed)
            }

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
            if (!(err instanceof GameEnded)) {
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
