import { MessageCollector, TextChannel } from 'discord.js'

import { createFuse, getFilter, getPrompt } from '../utils/Utils'
import { Deck } from './Deck'
import { CollectorError, GameEnded } from './Errors'

export abstract class Game {
    name: string

    deck: Deck
    channel: TextChannel
    collector: MessageCollector & { player: any }

    players: Array<any>
    hasStarted: boolean
    hasEnded: boolean

    protected constructor(name, leader, channel) {
        this.name = name
        this.players = []
        this.hasStarted = false
        this.channel = channel
        this.addPlayer(leader)

        let message = `Starting ${this.name} with ${leader}\n`
        message += `Type '!join' to join the game\n`
        message += `${leader}, type '!play' to start the game when all players have joined`
        this.channel.send(message)
    }

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
        return this.isPlayer(this.leader)
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

    async getResponse(player, string, responseOptions, numeric = false) {
        if (typeof responseOptions === 'string') {
            responseOptions = [responseOptions]
        }

        const fuse = createFuse(responseOptions, numeric)
        const prompt = `${player}, ${string} (${responseOptions.join('/')})`
        await this.channel.send(prompt)

        const { collector, message } = getPrompt(
            this.channel,
            getFilter(player, fuse),
        )
        this.collector = collector
        collector.player = player
        const res = await message

        if (!numeric) {
            return fuse.search(res.content)[0].item
        } else {
            return parseInt(res.content)
        }
    }

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
            } catch {}
        }

        return val
    }

    async play() {
        this.hasStarted = true
        await this.channel.send(`${this.leader} has started ${this.name}!`)
        try {
            await this.game()
        } catch (err) {
            if (!(err instanceof GameEnded)) {
                throw err
            }
        }

        await this.channel.send(`${this.name} has finished`)
    }

    async removePlayer(player) {
        // Stop the collector if it collects from the given player
        if (this.collector && player.equals(this.collector.player)) {
            this.collector.stop()
        }

        // Remove player
        const index = this.players.indexOf(player)
        if (index > -1) {
            this.players.splice(index, 1)
        }

        // Add removed player's cards to the deck
        this.deck.addCards(player.cards)
        player.removeAllCards()

        let message = `${player} decided to be a little bitch and quit ${this.name}\n`

        const additionalMessage = this.onRemovePlayer(player)

        if (additionalMessage) {
            message += additionalMessage
        }

        await this.channel.send(message)

        if (!this.hasPlayers()) {
            return this.endGame()
        }
    }

    async askAllPlayers(func) {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
                await func.call(this, player)
            } catch (err) {
                if (err instanceof CollectorError) {
                    this.isEnded()
                    i--
                } else {
                    throw err
                }
            }
        }
    }

    async whileAsk(boolean, func) {
        while (this.hasPlayers() && boolean()) {
            try {
                await func.call(this)
            } catch (err) {
                if (err instanceof CollectorError) {
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
                if (err instanceof CollectorError) {
                    this.isEnded()
                } else {
                    throw err
                }
            }
        }
    }

    abstract game(): void
    abstract onRemovePlayer(player): string
}
