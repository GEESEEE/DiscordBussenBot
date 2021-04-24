import {
    Collection,
    ReactionCollector,
    Structures,
    TextChannel,
} from 'discord.js'

import { Bussen } from './Game/Bussen'
import { Game } from './Game/Game'
import { ReactionStrings } from './utils/Consts'
import { getBinaryReactions } from './utils/Utils'

export const Server = Structures.extend('Guild', Guild => {
    class ServerClass extends Guild {
        currentGame: Game
        currentChannel: TextChannel
        collector: ReactionCollector

        constructor(x, y) {
            super(x, y)
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

        readyToHelp(message) {
            return this.validMessage(message)
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
                this.collector?.stop()
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
            const options = ReactionStrings.YES_NO
            for (const option of options) {
                await message.react(option)
            }

            const gameName = this.currentGame.name

            const { collected, collector } = await getBinaryReactions(
                message,
                10000,
                options,
            )
            this.collector = collector
            const col: any = await collected

            const max = Math.max(
                ...col.map(collection => collection.users.cache.size),
            )

            const maxEmoji = col
                .filter(collection => collection.users.cache.size === max)
                .first()?.emoji.name

            if (this.gameExists()) {
                if (ReactionStrings.YES_NO[0].includes(maxEmoji)) {
                    await this.currentGame.endGame()
                    if (!this.currentGame.hasStarted) {
                        await this.currentChannel.send(
                            `${gameName} has been removed`,
                        )
                    }
                    this.currentGame = null
                } else {
                    await this.currentChannel.send(`${gameName} will continue`)
                }
            } else {
                await this.currentChannel.send(`${gameName} is already gone`)
            }
        }
    }

    return ServerClass
})
