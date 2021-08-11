import Discord, {
    ButtonInteraction,
    InteractionCollector,
    MessageActionRow,
    MessageCollector,
    MessageEmbed,
    MessageReaction,
    ReactionCollector,
    TextChannel,
    User,
} from 'discord.js'

import { PlayerManager } from '../managers/PlayerManager'
import { Player } from '../structures/Player'
import { CardPrinter } from '../utils/CardPrinter'
import { Emoji } from '../utils/EmojiUtils'
import {
    createChecker,
    getActionRow,
    getFilter,
    getPrompt,
    getSingleInteraction,
    getSingleReaction,
    reactOptions,
    removeMessage,
    removeReaction,
} from '../utils/Utils'
import { Deck } from './Deck'
import {
    CollectorPlayerLeftError,
    CollectorPlayerPassedInput,
    GameEndedError,
} from './Errors'

export abstract class Game {
    name: string

    deck: Deck
    channel: TextChannel
    collector:
        | MessageCollector
        | ReactionCollector
        | InteractionCollector<ButtonInteraction>
    collectorPlayer: Player

    playerManager: PlayerManager
    leader: Player
    hasStarted: boolean

    protected constructor(name, leader, channel) {
        this.name = name
        this.playerManager = new PlayerManager()
        this.playerManager.addUser(leader)
        this.leader = this.playerManager.getPlayer(leader.id)
        this.hasStarted = false
        this.channel = channel
    }

    //region Simple Functions
    addPlayer(user: User) {
        if (!this.isPlayer(user)) {
            this.playerManager.addUser(user)
        }
    }

    isPlayer(user: User) {
        return this.playerManager.isPlayer(user)
    }

    isLeader(user: User) {
        if (this.hasPlayers()) {
            return this.playerManager.getPlayer(user.id) === this.leader
        } else {
            return null
        }
    }

    hasPlayers() {
        return this.playerManager.players.length > 0
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
        for (const player of this.playerManager.players) {
            if (player.hasCards()) {
                return false
            }
        }
        return true
    }

    async setLeader(user: User) {
        if (this.isPlayer(user) && !this.isLeader(user)) {
            this.leader = this.playerManager.getPlayer(user.id)
            const embed = new MessageEmbed().setTitle(
                `${this.leader} is the new leader!`,
            )
            await this.channel.send({ embeds: [embed] })
        }
    }

    //endregion

    //region Important Functions
    async replaceMessage(sentMessage, messageOptions) {
        const message = await this.channel.send(messageOptions)
        await removeMessage(sentMessage)
        return message
    }

    // if numeric is true, responseOptions should be 'x,y' as a string with x and y as numbers, also supports negative numbers
    // still works but generally nm,mot useful anymore
    async getResponse(player: User, string, responseOptions, numeric = false) {
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

    async getSingleInteraction(
        player: Player,
        sentMessage,
    ): Promise<ButtonInteraction> {
        const { collected, collector } = getSingleInteraction(
            player,
            sentMessage,
        )
        this.collector = collector
        this.collectorPlayer = player
        return collected
    }

    async getSingleReaction(
        player: Player,
        sentMessage,
        options,
    ): Promise<MessageReaction> {
        const { collected, collector } = getSingleReaction(
            player,
            sentMessage,
            options,
        )
        this.collector = collector
        this.collectorPlayer = player

        const col = await Promise.all([
            collected,
            reactOptions(sentMessage, options),
        ])

        return col[0]
    }

    private incSize(min, max, current, toAdd) {
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
        message,
        embed,
        options,
        player?: Player,
    ): Promise<number> {
        if (!player) {
            player = this.leader
        }
        const collected = new Promise((resolve, reject) => {
            collector.on(`collect`, async (reaction, user) => {
                const reactEmoji = reaction.emoji.toString()

                if (user.equals(player.user)) {
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
                        embed.fields[embed.fields.length - 1].value = `${val}`
                        await message.edit({ embeds: [embed] })
                    }
                    await removeReaction(reaction, user)
                }
            })

            collector.on(`end`, (collected, reason) => {
                if (reason === `removeplayer`) {
                    reject(new CollectorPlayerLeftError(``))
                }
            })
        })
        this.collector = collector
        this.collectorPlayer = player

        const col = await Promise.all([
            collected,
            reactOptions(message, options),
        ])

        return col[0] as number
    }

    getWaitForValueRow() {
        return getActionRow(['+1', '+3', '-1', '-3', 'Continue'])
    }

    async waitForInteractionValue(
        collector,
        val,
        min,
        max,
        message,
        embed,
        row: MessageActionRow,
        player?: Player,
    ) {
        if (!player) {
            player = this.leader
        }

        const collected = new Promise((resolve, reject) => {
            collector.on(`collect`, async interaction => {
                if (interaction.user.equals(player.user)) {
                    if (interaction.customId === 'Continue') {
                        collector.stop()
                        resolve(val)
                    } else {
                        if (interaction.customId === '+1') {
                            val = this.incSize(min, max, val, 1)
                        } else if (interaction.customId === '+3') {
                            val = this.incSize(min, max, val, 3)
                        } else if (interaction.customId === '-1') {
                            val = this.incSize(min, max, val, -1)
                        } else if (interaction.customId === '-3') {
                            val = this.incSize(min, max, val, -3)
                        }
                        embed.fields[embed.fields.length - 1].value = `${val}`
                        await message.edit({
                            embeds: [embed],
                            components: [row],
                        })
                    }
                }
            })

            collector.on(`end`, (collected, reason) => {
                if (reason === 'endgame') {
                    reject(new GameEndedError(`${this.name} has ended`))
                }
                if (reason === `removeplayer`) {
                    reject(new CollectorPlayerLeftError(``))
                }
            })
        })
        this.collector = collector
        this.collectorPlayer = player

        return (await collected) as number
    }

    async removePlayer(user: User) {
        if (this.isPlayer(user)) {
            const player = this.playerManager.getPlayer(user.id)
            if (this.collector && player.equals(this.collectorPlayer)) {
                this.collector?.stop(`removeplayer`)
            }

            const title = `${user.username} decided to be a little bitch and quit ${this.name}\n`
            let message = ``

            const wasLeader = this.isLeader(user)
            this.playerManager.removePlayer(user.id)

            if (wasLeader && this.hasPlayers()) {
                this.leader = this.playerManager.players[0]
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
                await this.channel.send({ embeds: [embed] })
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
        await this.channel.send({ embeds: [embed] })
        // const server: Guild = this.channel.guild
        // server.currentGame = null
    }

    abstract game(): void
    abstract onRemovePlayer(player): string
    abstract passInput(oldPlayer, newPlayer): void

    //endregion

    //region User Input Error Handling

    handleError(err) {
        if (err instanceof CollectorPlayerLeftError) {
            this.hasEnded()
        } else if (!(err instanceof CollectorPlayerPassedInput)) {
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
        for (let i = 0; i < this.playerManager.players.length; i++) {
            const player = this.playerManager.players[i]
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

    //region Card Printing

    async getCardAttachment(printer: CardPrinter, name: string) {
        await printer.print()
        return new Discord.MessageAttachment(
            printer.canvas.toBuffer('image/png'),
            name,
        )
    }

    playerCardAttachment(player: Player) {
        const printer = new CardPrinter()
            .addRow(`${player.user.username}'s Cards`)
            .addRow(player.cards)
        return this.getCardAttachment(printer, `pcards.png`)
    }

    drawnCardAttachment(card) {
        const printer = new CardPrinter()
            .addRow(`Drawn`, true)
            .addRow([card], true)
        return this.getCardAttachment(printer, `dcard.png`)
    }

    async setImages(embed, imageAttachment, thumbnailAttachment?) {
        const attachments = [imageAttachment]

        if (thumbnailAttachment) {
            attachments.push(thumbnailAttachment)
        }
        embed.setImage(`attachment://${imageAttachment.name}`)

        if (thumbnailAttachment) {
            embed.setThumbnail(`attachment://${thumbnailAttachment.name}`)
        }
        return attachments
    }

    //endregion
}
