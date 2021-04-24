import Discord, { TextChannel } from 'discord.js'

import { Bussen } from './Bussen'
import { ReactionStrings } from './utils/Consts'
import { getBinaryReactions } from './utils/Utils'

class BotClient extends Discord.Client {
    currentGame: Bussen
    currentChannel: TextChannel

    constructor(...args) {
        super(...args)
        this.currentGame = null
        this.currentChannel = null
    }

    hasChannel() {
        return this.currentChannel
    }

    isFromChannel(message) {
        return message.channel === this.currentChannel
    }

    validMessage(message) {
        return this.hasChannel() && this.isFromChannel(message)
    }

    gameExists() {
        return this.currentGame
    }

    readyToJoin(message) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            !this.currentGame.hasStarted &&
            !this.currentGame.players.some(player =>
                player.equals(message.author),
            )
        )
    }

    readyToPlay(message) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            this.currentGame.isLeader(message.author) &&
            !this.currentGame.hasStarted
        )
    }

    readyToQuit(message) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            this.currentGame.isPlayer(message.author)
        )
    }

    readyToKick(message, user) {
        return (
            user &&
            message.author !== user &&
            this.validMessage(message) &&
            this.gameExists() &&
            this.currentGame.isLeader(message.author) &&
            this.currentGame.isPlayer(user)
        )
    }

    async removePlayer(player) {
        await this.currentGame.removePlayer(player)
        if (!this.currentGame.hasPlayers()) {
            this.currentGame = null
        }
    }

    readyToEnd(message) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            this.currentGame?.isLeader(message.author)
        )
    }

    readyToRemove(message) {
        return this.validMessage(message) && this.gameExists()
    }

    async removeGame(message) {
        const collected: any = await getBinaryReactions(
            message,
            60000,
            ReactionStrings.YES_NO,
        )

        const max = Math.max(
            ...collected.map(collection => collection.users.cache.size),
        )

        const maxEmoji = collected
            .filter(collection => collection.users.cache.size === max)
            .first().emoji.name

        if (this.gameExists()) {
            if (ReactionStrings.YES_NO[0].includes(maxEmoji)) {
                await this.currentGame.endGame()
                if (!this.currentGame.hasStarted) {
                    await this.currentChannel.send(`The game has been removed`)
                }
                this.currentGame = null
            } else {
                await this.currentChannel.send(`The game will continue`)
            }
        } else {
            await this.currentChannel.send(`The game is already gone`)
        }
    }
}

module.exports = BotClient
