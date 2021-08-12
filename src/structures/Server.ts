import {
    InteractionCollector,
    MessageComponentInteraction,
    MessageEmbed,
    ReactionCollector,
    TextChannel,
    User,
} from 'discord.js'

import { maxReactionTime } from '../../config.json'
import { GameEndedError } from '../game/Errors'
import { Game } from '../game/Game'
import { DiscordErrors } from '../utils/Consts'
import { failSilently, getActionRow, removeMessage } from '../utils/Utils'

export class Server {
    currentGame: Game
    currentChannel: TextChannel
    collector:
        | ReactionCollector
        | InteractionCollector<MessageComponentInteraction>

    constructor() {
        this.currentGame = null
        this.currentChannel = null
    }

    hasChannel() {
        return Boolean(this.currentChannel)
    }

    isFromChannel(message) {
        return message.channel === this.currentChannel
    }

    validMessage(message) {
        return this.hasChannel() && this.isFromChannel(message)
    }

    gameExists() {
        return Boolean(this.currentGame)
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

    readyToPassInput(message, user) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            user instanceof User
        )
    }

    readyToMakeLeader(message, user) {
        return (
            this.validMessage(message) &&
            this.gameExists() &&
            this.currentGame.leader === message.author &&
            user instanceof User
        )
    }

    readyToShowGames(message) {
        return this.validMessage(message)
    }

    readyToRemove(message) {
        return this.validMessage(message) && this.gameExists()
    }

    getJoinEmbed() {
        if (this.currentGame) {
            return new MessageEmbed()
                .setTitle(
                    `${this.currentGame.name} with ${this.currentGame.leader.user.username} as the leader`,
                )
                .setDescription(
                    `Click **Join** to join the game\n${this.currentGame.leader} click **Start** to start the game when all players have joined`,
                )
                .addField(
                    `Players`,
                    this.currentGame.playerManager.players.join(`\n`),
                )
        }
    }

    async startGame() {
        const embed = this.getJoinEmbed()
        const row = getActionRow(['Join', 'Start'], ['PRIMARY', 'SECONDARY'])
        const sentMessage = await this.currentChannel.send({
            embeds: [embed],
            components: [row],
        })

        const collector = sentMessage.createMessageComponentCollector({
            filter: interaction => {
                interaction.deferUpdate()
                return true
            },
            dispose: true,
        })

        collector.on('collect', async interaction => {
            if (interaction.customId === 'Join' && !interaction.user.bot) {
                // if user not yet a player, add player and refresh embed
                if (!this.currentGame.isPlayer(interaction.user)) {
                    this.currentGame.addPlayer(interaction.user)
                    embed.fields[0].value =
                        this.currentGame.playerManager.players.join(`\n`)
                    await sentMessage.edit({
                        embeds: [embed],
                        components: [row],
                    })

                    // Else remove user
                } else {
                    await this.currentGame.removePlayer(interaction.user)

                    // If players left, update embed
                    if (this.gameExists() && this.currentGame.hasPlayers()) {
                        embed.fields[0].value =
                            this.currentGame.playerManager.players.join(`\n`)
                        await sentMessage.edit({
                            embeds: [embed],
                            components: [row],
                        })

                        // Else remove message and game
                    } else {
                        collector.stop()
                        await removeMessage(sentMessage)
                        this.currentGame = null
                    }
                }
            } else if (
                interaction.customId === 'Start' &&
                interaction.user.equals(this.currentGame.leader.user)
            ) {
                collector.stop()
                await this.currentGame.play()
                this.currentGame = null
            }
        })
    }

    async removeGameVote() {
        await failSilently(this.unsafeRemoveGameInteraction.bind(this), [
            DiscordErrors.UNKNOWN_MESSAGE,
        ])
    }

    private async unsafeRemoveGameInteraction() {
        const gameName = this.currentGame.name
        const yes = []
        const no = []

        const embed = new MessageEmbed()
            .setTitle('Remove Game?')
            .addField('Yes', '0', true)
            .addField('No', '0', true)
        const row = getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        const messageOptions = {
            embeds: [embed],
            components: [row],
        }
        const sentMessage = await this.currentChannel.send(messageOptions)

        const collector = sentMessage.createMessageComponentCollector({
            componentType: 'BUTTON',
            filter: interaction => {
                interaction.deferUpdate()
                return true
            },
            time: maxReactionTime,
        })

        const collected = new Promise((resolve, reject) => {
            collector.on('end', (collect, reason) => {
                if (reason === 'endgame') {
                    reject(new GameEndedError('Game Ended'))
                }
                resolve(collect)
            })
        })

        collector.on('collect', interaction => {
            if (interaction.customId === 'Yes') {
                if (no.includes(interaction.user)) {
                    const index = no.indexOf(interaction.user)
                    if (index > -1) {
                        no.splice(index)
                    }
                }
                if (!yes.includes(interaction.user)) {
                    yes.push(interaction.user)
                }
            } else if (interaction.customId === 'No') {
                const index = yes.indexOf(interaction.user)
                if (index > -1) {
                    yes.splice(index)
                }
                if (!no.includes(interaction.user)) {
                    no.push(interaction.user)
                }
            }
            embed.fields[0].value = `${yes.length}`
            embed.fields[1].value = `${no.length}`
            sentMessage.edit(messageOptions)
        })
        this.collector = collector
        await collected

        let response
        if (this.gameExists() && !this.currentGame.collector.ended) {
            if (yes.length > no.length) {
                try {
                    this.currentGame.endGame()
                } catch {}

                response = `${gameName} has been removed`
                this.currentGame = null
            } else {
                response = `${gameName} will continue`
            }
        } else {
            response = `${gameName} is already gone`
        }
        await this.currentChannel.send({
            embeds: [new MessageEmbed().setTitle(response)],
        })
    }
}
