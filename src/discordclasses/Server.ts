import {
    MessageEmbed,
    ReactionCollector,
    Structures,
    TextChannel,
} from 'discord.js'

const { maxReactionTime } = require('../../config.json')

import { Game } from '../game/Game'
import { DiscordErrors } from '../utils/Consts'
import { Emoji, ReactionEmojis } from '../utils/EmojiUtils'
import {
    failSilently,
    getBinaryReactions,
    inElementOf,
    reactOptions,
    removeMessage,
} from '../utils/Utils'

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

        readyToStart(message) {
            return this.validMessage(message) && !this.gameExists()
        }

        readyToQuit(message) {
            return (
                this.validMessage(message) &&
                this.gameExists() &&
                this.currentGame.hasStarted &&
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
            if (!this.currentGame?.hasPlayers()) {
                this.collector?.stop()
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

        readyToShowGames(message) {
            return this.validMessage(message)
        }

        getJoinEmbed() {
            if (this.currentGame) {
                return new MessageEmbed()
                    .setTitle(
                        `${this.currentGame.name} with ${this.currentGame.leader.username} as the leader`,
                    )
                    .setDescription(
                        `Click ${Emoji.JOIN} to join the game\n${this.currentGame.leader} click ${Emoji.PLAY} to start the game when all players have joined`,
                    )
                    .addField(`Players`, this.currentGame.players.join(`\n`))
            }
        }

        async startGame() {
            const reactionOptions = ReactionEmojis.JOIN_START
            let embed = this.getJoinEmbed()
            const sentMessage = await this.currentChannel.send(embed)

            const collector = sentMessage.createReactionCollector(
                (reaction, _) => {
                    const emojiName = reaction.emoji.name
                    return inElementOf(reactionOptions, emojiName)
                },
                { dispose: true },
            )

            collector.on('collect', async (reaction, user) => {
                const newReactionName = reaction.emoji.name
                const users = reaction.users.cache

                if (Emoji.JOIN.includes(newReactionName) && !user.bot) {
                    if (users.has(user.id)) {
                        if (!this.currentGame.isPlayer(user)) {
                            this.currentGame.addPlayer(user)
                            embed.fields[0].value = this.currentGame.players.join(
                                `\n`,
                            )
                            await sentMessage.edit(embed)
                        }
                    }
                } else if (
                    Emoji.PLAY.includes(newReactionName) &&
                    user.equals(this.currentGame.leader)
                ) {
                    collector.stop()
                    await this.currentGame.play()
                    this.currentGame = null
                }
            })

            collector.on(`remove`, async (reaction, user) => {
                const reactionName = reaction.emoji.name
                if (
                    Emoji.JOIN.includes(reactionName) &&
                    this.currentGame.isPlayer(user)
                ) {
                    const wasLeader = user.equals(this.currentGame.leader)
                    await this.removePlayer(user)

                    if (this.gameExists() && this.currentGame.hasPlayers()) {
                        if (wasLeader) {
                            embed = this.getJoinEmbed()
                        } else {
                            embed.fields[0].value = this.currentGame.players.join(
                                `\n`,
                            )
                        }
                        await sentMessage.edit(embed)
                    } else {
                        collector.stop()
                        await removeMessage(sentMessage)
                        this.currentGame = null
                    }
                }
            })

            await reactOptions(sentMessage, reactionOptions)
        }

        async removeGameVote(message) {
            await failSilently(this.unsafeRemoveGameVote.bind(this, message), [
                DiscordErrors.UNKNOWN_MESSAGE,
            ])
        }

        async unsafeRemoveGameVote(message) {
            const options = ReactionEmojis.YES_NO

            const gameName = this.currentGame.name

            const { collected, collector } = await getBinaryReactions(
                message,
                maxReactionTime,
                options,
            )
            this.collector = collector
            const col = await collected

            const max = Math.max(
                ...col.map(collection => collection.users.cache.size),
            )
            const maxEmoji = col
                .filter(collection => collection.users.cache.size === max)
                .first()?.emoji.name
            let response
            if (this.gameExists()) {
                if (options[0].includes(maxEmoji)) {
                    try {
                        await this.currentGame.endGame()
                    } catch {}

                    response = `${gameName} has been removed`
                    this.currentGame = null
                } else {
                    response = `${gameName} will continue`
                }
            } else {
                response = `${gameName} is already gone`
            }
            await this.currentChannel.send(
                new MessageEmbed().setTitle(response),
            )
        }
    }

    return ServerClass
})
