import {
    MessageEmbed,
    ReactionCollector,
    Structures,
    TextChannel,
} from 'discord.js'

const { maxReactionTime } = require('../config.json')

import { Game } from './game/Game'
import { DiscordErrors, ReactionEmojis } from './utils/Consts'
import { Emoji } from './utils/Emoji'
import {
    failSilently,
    getBinaryReactions,
    inElementOf,
    removeMessage,
} from './utils/Utils'

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
            } else {
                return null
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
                console.log(reactionName, user.username)
                if (
                    Emoji.JOIN.includes(reactionName) &&
                    this.currentGame.isPlayer(user)
                ) {
                    const wasLeader = user.equals(this.currentGame.leader)
                    await this.removePlayer(user)

                    if (this.currentGame && this.currentGame.hasPlayers()) {
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
                    }
                }
            })

            for (const emoji of reactionOptions) {
                await sentMessage.react(emoji)
            }
        }

        async removeGameVote(message) {
            await failSilently(this.unsafeRemoveGameVote.bind(this, message), [
                DiscordErrors.UNKNOWN_MESSAGE,
            ])
        }

        async unsafeRemoveGameVote(message) {
            const options = ReactionEmojis.YES_NO

            for (const option of options) {
                await message.react(option)
            }

            const gameName = this.currentGame.name

            const { collected, collector } = await getBinaryReactions(
                message,
                maxReactionTime,
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
                if (ReactionEmojis.YES_NO[0].includes(maxEmoji)) {
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
