import Discord, {
    ButtonInteraction,
    Channel,
    Interaction,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageAttachment,
    MessageCollector,
    MessageEmbed,
    MessageOptions,
    ReactionCollector,
    TextBasedChannels,
    TextChannel,
    User,
} from 'discord.js'

import { PlayerManager } from '../managers/PlayerManager'
import { Player } from '../structures/Player'
import { CardPrinter } from '../utils/CardPrinter'
import {
    getActionRow,
    getSingleInteraction,
    incSize,
    removeMessage,
} from '../utils/Utils'
import { Card, Deck } from './Deck'
import {
    CollectorPlayerLeftError,
    CollectorPlayerPassedInput,
    GameEndedError,
} from './Errors'

export abstract class Game {
    name: string

    deck!: Deck
    channel: TextBasedChannels
    collector:
        | MessageCollector
        | ReactionCollector
        | InteractionCollector<ButtonInteraction>
        | undefined

    collectorPlayer: Player | undefined

    playerManager: PlayerManager
    leader: Player
    hasStarted: boolean

    protected constructor(
        name: string,
        leader: User,
        channel: TextBasedChannels,
    ) {
        this.name = name
        this.playerManager = new PlayerManager()
        this.playerManager.addUser(leader)
        this.leader = this.playerManager.getPlayer(leader.id)!
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
            const player = this.playerManager.getPlayer(user.id)
            if (typeof player === 'undefined') return
            this.leader = player
            const embed = new MessageEmbed().setTitle(
                `${this.leader.user.username} is the new leader!`,
            )
            await this.channel.send({ embeds: [embed] })
        }
    }

    //endregion

    //region Important Functions
    async replaceMessage(sentMessage: Message, messageOptions: MessageOptions) {
        const message = await this.channel.send(messageOptions)
        await removeMessage(sentMessage)
        return message
    }

    async getSingleInteraction(
        player: Player,
        sentMessage: Message,
    ): Promise<ButtonInteraction> {
        const { collected, collector } = getSingleInteraction(
            player,
            sentMessage,
        )
        this.collector = collector
        this.collectorPlayer = player
        return collected
    }

    getWaitForValueRow() {
        return getActionRow(['+1', '+3', '-1', '-3', 'Continue'])
    }

    async waitForInteractionValue(
        collector: InteractionCollector<ButtonInteraction>,
        val: number,
        min: number,
        max: number,
        message: Message,
        embed: MessageEmbed,
        row: MessageActionRow,
        player?: Player,
    ) {
        if (typeof player === 'undefined') {
            player = this.leader
        }

        const collected = new Promise((resolve, reject) => {
            collector.on(`collect`, async (interaction: ButtonInteraction) => {
                if (interaction.user.equals(player!.user)) {
                    if (interaction.customId === 'Continue') {
                        collector.stop()
                        resolve(val)
                    } else {
                        if (interaction.customId === '+1') {
                            val = incSize(min, max, val, 1)
                        } else if (interaction.customId === '+3') {
                            val = incSize(min, max, val, 3)
                        } else if (interaction.customId === '-1') {
                            val = incSize(min, max, val, -1)
                        } else if (interaction.customId === '-3') {
                            val = incSize(min, max, val, -3)
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
            if (typeof player === 'undefined') return
            if (this.collector && player.equals(this.collectorPlayer!)) {
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

            const additionalMessage = this.onRemovePlayer(player.user)

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
    abstract onRemovePlayer(user: User): string
    abstract passInput(oldPlayer: User, newPlayer: User): void

    //endregion

    //region User Input Error Handling

    handleError(err: Error) {
        if (err instanceof CollectorPlayerLeftError) {
            this.hasEnded()
        } else if (!(err instanceof CollectorPlayerPassedInput)) {
            throw err
        }
    }

    // This will continually ask the given player for a response using getResponse
    // if the player leaves during this, it returns undefined
    async loopForResponse(func: () => Promise<void>) {
        let succes
        while (!succes && this.hasPlayers()) {
            try {
                await func.call(this)
                succes = true
            } catch (err) {
                this.handleError(err)
            }
        }
    }

    async askAllPlayers(func: (player: Player) => Promise<void>) {
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

    async askWhile(boolean: () => boolean, func: () => Promise<void>) {
        while (this.hasPlayers() && boolean()) {
            try {
                await func.call(this)
            } catch (err) {
                this.handleError(err)
            }
        }
    }

    async ask(func: () => Promise<void>) {
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

    drawnCardAttachment(card: Card) {
        const printer = new CardPrinter()
            .addRow(`Drawn`, true)
            .addRow([card], true)
        return this.getCardAttachment(printer, `dcard.png`)
    }

    async setImages(
        embed: MessageEmbed,
        imageAttachment: MessageAttachment,
        thumbnailAttachment?: MessageAttachment,
    ) {
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
