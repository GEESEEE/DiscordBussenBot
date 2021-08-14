import {
    ButtonInteraction,
    Message,
    MessageActionRow,
    MessageEmbed,
    TextBasedChannels,
    User,
} from 'discord.js'
import pluralize from 'pluralize'

import { PlayerManager } from '../../../managers/PlayerManager'
import { Player } from '../../../structures/Player'
import { CardPrinter } from '../../../utils/CardPrinter'
import { EmptyString } from '../../../utils/Consts'
import {
    createRows,
    getActionRow,
    getInteractionCollector,
    sum,
} from '../../../utils/Utils'
import { Card, Deck } from '../../Deck'
import { Game } from '../../Game'
import { Bus } from './Bus'
import { BussenCard } from './BussenCard'
import { Pyramid } from './Pyramid'

export default class Bussen extends Game {
    drinks: number
    pyramid!: Pyramid
    bus!: Bus
    busPlayerManager: PlayerManager

    constructor(name: string, leader: User, channel: TextBasedChannels) {
        super(name, leader, channel)
        this.deck = new Deck(BussenCard)
        this.drinks = 1
        this.busPlayerManager = new PlayerManager()
    }

    onRemovePlayer(user: User) {
        // if removed player is in the bus, swap for new player
        if (this.bus) {
            const player = this.busPlayerManager.getPlayer(user.id)
            if (player?.equals(this.bus.player)) {
                const newPlayer = this.getNewBusPlayer()
                if (newPlayer) {
                    this.bus.player = newPlayer
                    return `Because ${player} was in the bus, ${newPlayer} is now chosen to be the bus driver`
                }
            }

            if (this.busPlayerManager.isPlayer(user)) {
                this.busPlayerManager.removePlayer(user.id)
            }
        }
        return ''
    }

    async game() {
        // Phase 1 questions
        await this.askAllPlayers(this.askColour)
        await this.askAllPlayers(this.askHigherLower)
        await this.askAllPlayers(this.askBetween)
        await this.askAllPlayers(this.askSuit)

        // Phase 2 Pyramid
        await this.loopForResponse(this.initPyramid)
        await this.askWhile(
            () =>
                this.pyramid &&
                !this.pyramid.isEmpty() &&
                !this.noOneHasCards(),
            this.playPyramid,
        )
        // Phase 3 The Bus
        await this.loopForResponse(this.initBus)
        await this.askWhile(
            () => this.bus && !this.bus.isFinished,
            this.playBus,
        )
    }

    //region Phase 1 Helpers

    async createEmbed(
        player: Player,
        question: string,
        card?: Card,
        reaction?: string,
        verdict?: string,
    ) {
        const attachments = []
        if (player.cards.length > 0) {
            const playerCardAttachment = await this.playerCardAttachment(player)
            attachments.push(playerCardAttachment)
        }

        if (card) {
            const drawnCardAttachment = await this.drawnCardAttachment(card)
            attachments.push(drawnCardAttachment)
        }

        let description = `${player}, ${question}`
        if (card) {
            description += `\n${player} chose ` + '`' + `${reaction}` + '`'
        }

        const embed = new MessageEmbed()
            .setTitle(`${player.user.username}'s turn`)
            .setDescription(description)

        if (attachments.length > 0) {
            await this.setImages(
                embed,
                attachments[0],
                attachments.length === 2 ? attachments[1] : undefined,
            )
        }

        if (card && verdict) {
            embed.addField(`Verdict`, verdict)
        }

        return { embed, attachments }
    }

    async getInteraction(
        player: Player,
        question: string,
        row: MessageActionRow,
    ) {
        const { embed, attachments } = await this.createEmbed(player, question)

        const message = await this.channel.send({
            embeds: [embed],
            files: attachments,
            components: [row],
        })

        const collected = await this.getSingleInteraction(player, message)
        return { message, collected: collected as ButtonInteraction }
    }

    getMessage(
        isEqual: boolean,
        isTrue: boolean,
        player: Player,
        card: Card,
        rainbow?: boolean,
    ) {
        const drinks = this.drinks
        let message
        if (isEqual) {
            message = `${player} drew ${card} and everyone has to consume ${pluralize(
                'drink',
                drinks,
                true,
            )}`
        } else if (isTrue) {
            if (!rainbow) {
                message = `${player} drew ${card} and was correct`
            } else {
                message = `${player} created a 🌈 and everyone else has to consume ${pluralize(
                    'drink',
                    drinks,
                    true,
                )}`
            }
        } else {
            message = `${player} drew ${card} and has to consume ${pluralize(
                'drink',
                drinks,
                true,
            )}`
        }

        return message
    }

    async addVerdict(
        sentMessage: Message,
        isTrue: boolean,
        player: Player,
        question: string,
        card: Card,
        reaction: string,
        rainbow?: boolean,
    ) {
        const verdict = this.getMessage(
            card.isEqualTo(player.cards),
            isTrue,
            player,
            card,
            rainbow,
        )
        const { embed, attachments } = await this.createEmbed(
            player,
            question,
            card,
            reaction,
            verdict,
        )

        await this.replaceMessage(sentMessage, {
            embeds: [embed],
            files: attachments,
        })
        player.addCard(card)
    }
    //endregion

    //region Phase 1 Questions

    async askColour(player: Player) {
        const question = `red or black?`
        const row = getActionRow(['Red', 'Black'], ['DANGER', 'SECONDARY'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()!
        const isTrue =
            (collected.customId === 'Red' && card.isRed()) ||
            (collected.customId === 'Black' && card.isBlack())

        await this.addVerdict(
            message,
            isTrue,
            player,
            question,
            card,
            collected.customId,
        )
    }

    async askHigherLower(player: Player) {
        const question = `higher or lower than ${player.cards[0]}?`
        const row = getActionRow(['Higher', 'Lower'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()!
        const isTrue =
            (collected.customId === 'Higher' && card > player.cards[0]) ||
            (collected.customId === 'Lower' && card < player.cards[0])

        await this.addVerdict(
            message,
            isTrue,
            player,
            question,
            card,
            collected.customId,
        )
    }

    async askBetween(player: Player) {
        const question = `is it between ${player.cards[0]} and ${player.cards[1]}?`
        const row = getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()!
        const isBetween = card.isBetween(player.cards[0], player.cards[1])
        const isTrue =
            (collected.customId === 'Yes' && isBetween) ||
            (collected.customId === 'No' && !isBetween)

        await this.addVerdict(
            message,
            isTrue,
            player,
            question,
            card,
            collected.customId,
        )
    }

    async askSuit(player: Player) {
        const question = `do you already have the suit, you have ${[
            ...new Set(player.cards.map(cards => cards.suit)),
        ].join(', ')}?`
        const row = getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()!
        const hasSameSuit = card.hasSameSuit(player.cards)
        const tru =
            (collected.customId === 'Yes' && hasSameSuit) ||
            (collected.customId === 'No' && !hasSameSuit)
        const rbow = player.suitsCount() === 3

        await this.addVerdict(
            message,
            tru,
            player,
            question,
            card,
            collected.customId,
            rbow,
        )
    }
    //endregion

    //region Phase 2 Pyramid

    async getPyramidAttachment(focusedIndex = 0) {
        const rows = createRows(this.pyramid.cards, this.pyramid.rows)
        const centered = [true]
        let hidden
        let focused

        if (focusedIndex) {
            focusedIndex = this.pyramid.cards.length - focusedIndex
            hidden = []
            focused = []
            let curr = 0

            for (const row of rows) {
                const rowHidden = []
                const rowFocused = []

                for (let i = 0; i < row.length; i++) {
                    if (curr < focusedIndex) {
                        rowHidden.push(true)
                    } else {
                        rowHidden.push(false)
                    }

                    if (curr <= focusedIndex) {
                        rowFocused.push(i)
                    }
                    curr += 1
                }
                hidden.push(rowHidden)
                focused.push(rowFocused)
            }
        }

        const cardPrinter = await new CardPrinter().addRows(
            rows,
            centered,
            focused,
            hidden,
        )

        return this.getCardAttachment(cardPrinter, 'pyramid.png')
    }

    async initPyramid() {
        const deckSize = this.deck.cards.length
        let maxSize = 1
        for (let i = 1; i < 12; i++) {
            if (sum(i) <= deckSize) {
                maxSize = i
            }
        }

        let pyramidSize = 1
        const embed = new MessageEmbed()
            .setTitle(`Pyramid`)
            .setDescription(
                `${this.leader}, how tall should the pyramid be? (1-${maxSize})`,
            )
            .addField(`Pyramid Size`, `${pyramidSize}`, true)

        const row = this.getWaitForValueRow()

        let sentMessage = await this.channel.send({
            embeds: [embed],
            components: [row],
        })
        const sizeCollector = getInteractionCollector(this.leader, sentMessage)

        pyramidSize = await this.waitForValue(
            sizeCollector,
            pyramidSize,
            1,
            maxSize,
            sentMessage,
            embed,
            row,
        )

        if (pyramidSize) {
            embed
                .setDescription(
                    `${this.leader}, should the pyramid be reversed?`,
                )
                .addField(`Reversed`, EmptyString, true)
            const row = getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
            sentMessage = await this.replaceMessage(sentMessage, {
                embeds: [embed],
                components: [row],
            })

            const collected = await this.getSingleInteraction(
                this.leader,
                sentMessage,
                true,
            )

            if (collected) {
                const reverse = collected.customId === 'Yes'

                this.pyramid = new Pyramid(this.deck, reverse, pyramidSize)
                const attachment = await this.getPyramidAttachment(-1)
                embed.fields[1].value = `${collected.customId}`
                await this.setImages(embed, attachment)

                await this.replaceMessage(sentMessage, {
                    embeds: [embed],
                    files: [attachment],
                })
            }
        }
    }

    async playPyramid() {
        const { card, drinks } = this.pyramid.getNextCard()!

        const pyramidAttachment = await this.getPyramidAttachment(
            this.pyramid.index,
        )
        const drawnCardAttachment = await this.drawnCardAttachment(card)

        let message = `Drew ${card}\n`
        for (const player of this.playerManager.players) {
            if (player.hasValueInHand(card)) {
                const playerCards = player.getCardsWithValue(card)
                const playerCardsString = playerCards.join(', ')
                message += `${player} put down ${playerCardsString} and can give **${
                    drinks * playerCards.length
                } drinks** to other players.`
            } else {
                message += `${player} has no card with value ${card.value} to put down.`
            }
            message += ` Cards left: ${player.cards.length}\n`
        }

        const embed = new MessageEmbed()
            .setTitle(`Pyramid Card ${this.pyramid.index}`)
            .setDescription(message)
        await this.setImages(embed, pyramidAttachment, drawnCardAttachment)

        const row = getActionRow(['Continue'])

        const sentMessage = await this.channel.send({
            embeds: [embed],
            files: [pyramidAttachment, drawnCardAttachment],
            components: [row],
        })

        await this.getSingleInteraction(this.leader, sentMessage)
    }

    //endregion

    //region Phase 3 Bus

    async getBusAttachment(focus?: boolean, showDrawn?: boolean) {
        const { rows, centered, focused, hidden } = this.bus.cardPrinterParams(
            focus,
            showDrawn,
        )

        const cardPrinter = await new CardPrinter().addRows(
            rows,
            centered,
            focused,
            hidden,
        )

        return this.getCardAttachment(cardPrinter, 'bus.png')
    }

    getNewBusPlayer(): Player {
        let newPlayer
        if (this.busPlayerManager.players.length > 0) {
            const index = Math.floor(
                Math.random() * this.busPlayerManager.players.length,
            )
            newPlayer = this.busPlayerManager.players[index]
            this.busPlayerManager.removePlayer(newPlayer.user.id)
        } else {
            newPlayer =
                this.playerManager.players[
                    Math.floor(
                        Math.random() * this.playerManager.players.length,
                    )
                ]
        }
        return newPlayer
    }

    async initBus() {
        const maxCardCount = Math.max(
            ...this.playerManager.players.map(player => player.cards.length),
        )
        const busPlayers = this.playerManager.players.filter(
            player => player.cards.length === maxCardCount,
        )
        for (const player of busPlayers) {
            this.busPlayerManager.addPlayer(player)
        }

        let message = `${(this.busPlayerManager.players.length > 0
            ? this.busPlayerManager.players
            : this.playerManager.players
        ).join(', ')} all have ${maxCardCount} cards`

        const busPlayer = this.getNewBusPlayer()
        message += `, but ${busPlayer} has been selected as the bus driver!`

        // Removing busPlayer from busPlayers
        this.busPlayerManager.removePlayer(busPlayer.user.id)

        // removing all players' cards, because they dont use them in the bus
        for (const player of this.playerManager.players) {
            player.removeAllCards()
        }

        const embed = new MessageEmbed()
            .setTitle(`The BUSSS`)
            .setDescription(message)
            .addField(EmptyString, `${busPlayer}, should the bus be hidden?`)
            .addField(`Hidden`, EmptyString, true)

        const row = getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        let sentMessage = await this.channel.send({
            embeds: [embed],
            components: [row],
        })

        const collected = await this.getSingleInteraction(
            busPlayer,
            sentMessage,
        )

        if (collected) {
            const hidden = collected.customId === 'Yes'

            embed.fields[1].value = `${collected.customId}`

            let busSize = 1
            embed.fields[0].value = `${busPlayer}, how long should the bus be? (1-20)`
            embed.addField(`Bus Size`, `${busSize}`, true)
            const row = this.getWaitForValueRow()
            sentMessage = await this.replaceMessage(sentMessage, {
                embeds: [embed],
                components: [row],
            })

            const busSizeCollector = getInteractionCollector(
                busPlayer,
                sentMessage,
            )

            busSize = await this.waitForValue(
                busSizeCollector,
                busSize,
                1,
                20,
                sentMessage,
                embed,
                row,
                busPlayer,
            )

            if (busSize) {
                let checkpoints = 0
                if (busSize > 2) {
                    const maxCheckPoints = Math.floor(busSize / 3)
                    embed.fields[0].value = `${busPlayer}, how many checkpoints should the bus have? (0-${maxCheckPoints})`
                    embed.addField(`Checkpoints`, `${checkpoints}`, true)
                    const row = this.getWaitForValueRow()
                    await sentMessage.edit({
                        embeds: [embed],
                        components: [row],
                    })

                    const checkpointCollector = getInteractionCollector(
                        busPlayer,
                        sentMessage,
                    )

                    checkpoints = await this.waitForValue(
                        checkpointCollector,
                        checkpoints,
                        0,
                        maxCheckPoints,
                        sentMessage,
                        embed,
                        row,
                        busPlayer,
                    )
                }

                this.bus = new Bus(busPlayer, busSize, checkpoints, hidden)

                const attachment = await this.getBusAttachment()
                await this.setImages(embed, attachment)
                await this.replaceMessage(sentMessage, {
                    embeds: [embed],
                    files: [attachment],
                })
            }
        }
    }

    async playBus() {
        const oldCard = this.bus.getCurrentCard()
        let busAttachment = await this.getBusAttachment(true)
        const embed1 = new MessageEmbed()
            .setTitle(`BUSSS Card ${this.bus.currentIndex + 1}`)
            .setDescription(
                `${this.bus.player}, higher or lower${
                    this.bus.hidden && this.bus.currentIndex > this.bus.maxIndex
                        ? ''
                        : ' than ' + oldCard.toString()
                }?`,
            )
        await this.setImages(embed1, busAttachment)
        let row = getActionRow(['Higher', 'Lower'])
        const sentMessage = await this.channel.send({
            embeds: [embed1],
            files: [busAttachment],
            components: [row],
        })
        const collected = await this.getSingleInteraction(
            this.bus.player,
            sentMessage,
        )

        const newCard = this.bus.getRandomCard()!
        const correct =
            (collected.customId === 'Higher' && newCard > oldCard) ||
            (collected.customId === 'Lower' && newCard < oldCard)

        let message
        let newBusPlayer
        if (correct) {
            if (this.bus.currentIndex + 2 <= this.bus.size) {
                message = `${
                    this.bus.player
                } drew ${newCard} and can advance to card ${
                    this.bus.currentIndex + 2
                } `
            } else {
                message = `${this.bus.player} managed to escape the BUSS in ${
                    this.bus.turns
                } turns\n${this.bus.printDrinkMap()}`
            }
        } else if (
            newCard.equals(oldCard) &&
            this.playerManager.players.length > 1
        ) {
            newBusPlayer = this.getNewBusPlayer()
            message = `${this.bus.player} drew ${newCard} so ${newBusPlayer} is now the BUSS driver!\n${this.bus.player} still has to consume ${this.bus.drinkCount} drinks, though.`
        } else {
            message = `${this.bus.player} drew ${newCard}, has to consume **${
                this.bus.drinkCount
            } drinks** and resets to card ${
                this.bus.getCurrentCheckpoint() + 1
            }`
        }

        embed1.description +=
            `\n${this.bus.player} chose ` + '`' + `${collected.customId}` + '`'
        embed1.addField(`Verdict`, message)

        const drawnCardAttachment = await this.drawnCardAttachment(newCard)
        busAttachment = await this.getBusAttachment(true, true)
        await this.setImages(embed1, busAttachment, drawnCardAttachment)
        this.bus.iterate(newCard, correct)

        if (!correct) {
            row = getActionRow(['Continue'])
        }

        const lastMessage = await this.replaceMessage(sentMessage, {
            embeds: [embed1],
            files: [busAttachment, drawnCardAttachment],
            components: correct ? [] : [row],
        })

        if (!correct) {
            await this.getSingleInteraction(this.bus.player, lastMessage)
        }
        if (newBusPlayer) {
            this.bus.player = newBusPlayer
        }
    }

    //endregion
}
