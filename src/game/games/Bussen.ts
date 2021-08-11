import {
    ButtonInteraction,
    MessageActionRow,
    MessageEmbed,
    User,
} from 'discord.js'

import { PlayerManager } from '../../managers/PlayerManager'
import { Player } from '../../structures/Player'
import { CardPrinter } from '../../utils/CardPrinter'
import { EmptyString, Value } from '../../utils/Consts'
import { Emoji, EmojiStrings, ReactionEmojis } from '../../utils/EmojiUtils'
import {
    createRows,
    getInteractionCollector,
    getReactionsCollector,
    sum,
} from '../../utils/Utils'
import { Card, Deck } from '../Deck'
import { Game } from '../Game'

const pluralize = require(`pluralize`)

export default class Bussen extends Game {
    drinks: number
    pyramid: Pyramid
    bus: Bus
    busPlayerManager: PlayerManager

    constructor(name, leader, channel) {
        super(name, leader, channel)
        this.deck = new Deck(BussenCard)
        this.drinks = 1
        this.busPlayerManager = new PlayerManager()
    }

    onRemovePlayer(user: User) {
        // if removed player is in the bus, swap for new player
        if (this.bus) {
            const player = this.busPlayerManager.getPlayer(user.id)
            if (player.equals(this.bus.player)) {
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
    }

    async game() {
        // Phase 1 questions
        await this.askAllPlayers(this.askColour)
        // await this.askAllPlayers(this.askHigherLower)
        // await this.askAllPlayers(this.askBetween)
        // await this.askAllPlayers(this.askSuit)
        //
        // // Phase 2 Pyramid
        await this.loopForResponse(this.initPyramid)
        await this.askWhile(
            () =>
                this.pyramid &&
                !this.pyramid.isEmpty() &&
                !this.noOneHasCards(),
            this.playPyramid,
        )
        //
        // // Phase 3 The Bus
        await this.loopForResponse(this.initBus)
        // await this.askWhile(
        //     () => this.bus && !this.bus.isFinished,
        //     this.playBus,
        // )
    }

    //region Phase 1 Helpers

    async createEmbed(player: Player, question, card?, reaction?, verdict?) {
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
                attachments.length === 2 ? attachments[1] : null,
            )
        }

        if (card) {
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

    getMessage(isEqual, isTrue, player: Player, card, rainbow?) {
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
        sentMessage,
        isTrue,
        player: Player,
        question,
        card,
        reaction,
        rainbow?,
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

        await this.replaceMessage(sentMessage, embed, attachments)
        player.addCard(card)
    }
    //endregion

    //region Phase 1 Questions

    async askColour(player) {
        const question = `red or black?`
        const row = this.getActionRow(['Red', 'Black'], ['DANGER', 'SECONDARY'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()
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

    async askHigherLower(player) {
        const question = `higher or lower than ${player.cards[0]}?`
        const row = this.getActionRow(['Higher', 'Lower'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()
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

    async askBetween(player) {
        const question = `is it between ${player.cards[0]} and ${player.cards[1]}?`
        const row = this.getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()
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

    async askSuit(player) {
        const question = `do you already have the suit, you have ${[
            ...new Set(player.cards.map(cards => cards.suit)),
        ].join(', ')}?`
        const row = this.getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
        const { message, collected } = await this.getInteraction(
            player,
            question,
            row,
        )

        const card = this.deck.getRandomCard()
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
        let maxSize
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

        const row = this.getActionRow(['+1', '+3', '-1', '-3', 'Start'])

        let sentMessage = await this.channel.send({
            embeds: [embed],
            components: [row],
        })
        const sizeCollector = getInteractionCollector(this.leader, sentMessage)

        pyramidSize = await this.waitForInteractionValue(
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
            const row = this.getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
            sentMessage = await this.replaceMessage(
                sentMessage,
                embed,
                [],
                [row],
            )

            const collected = await this.getSingleInteraction(
                this.leader,
                sentMessage,
            )

            if (collected) {
                const reverse = collected.customId === 'Yes'

                this.pyramid = new Pyramid(this.deck, reverse, pyramidSize)
                const attachment = await this.getPyramidAttachment(-1)
                embed.fields[1].value = `${collected.customId}`
                await this.setImages(embed, attachment)

                await this.replaceMessage(sentMessage, embed, [attachment])
            }
        }
    }

    async playPyramid() {
        const { card, drinks } = this.pyramid.getNextCard()

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

        const row = this.getActionRow(['Continue'])

        const sentMessage = await this.channel.send({
            embeds: [embed],
            files: [pyramidAttachment, drawnCardAttachment],
            components: [row],
        })

        await this.getSingleInteraction(this.leader, sentMessage)
    }

    //endregion

    //region Phase 3 Bus

    async getBusAttachment(focus?, showDrawn?) {
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
        const row = this.getActionRow(['Yes', 'No'], ['PRIMARY', 'DANGER'])
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

            const sizeOptions = ReactionEmojis.HIGHER_LOWER2
            let busSize = 1
            embed.fields[0].value = `${busPlayer}, how long should the bus be? (1-20)`
            embed.addField(`Bus Size`, `${busSize}`, true)
            sentMessage = await this.replaceMessage(sentMessage, embed)

            const busSizeCollector = getReactionsCollector(
                busPlayer,
                sentMessage,
                sizeOptions,
            )

            busSize = await this.waitForValue(
                busSizeCollector,
                busSize,
                1,
                20,
                sentMessage,
                embed,
                sizeOptions,
                busPlayer,
            )

            if (busSize) {
                let checkpoints = 0
                if (busSize > 2) {
                    const maxCheckPoints = Math.floor(busSize / 3)
                    embed.fields[0].value = `${busPlayer}, how many checkpoints should the bus have? (0-${maxCheckPoints})`
                    embed.addField(`Checkpoints`, `${checkpoints}`, true)
                    await sentMessage.edit({ embeds: [embed] })

                    const checkpointCollector = getReactionsCollector(
                        busPlayer,
                        sentMessage,
                        sizeOptions,
                    )

                    checkpoints = await this.waitForValue(
                        checkpointCollector,
                        checkpoints,
                        0,
                        maxCheckPoints,
                        sentMessage,
                        embed,
                        sizeOptions,
                        busPlayer,
                    )
                }

                this.bus = new Bus(busPlayer, busSize, checkpoints, hidden)

                const attachment = await this.getBusAttachment()
                await this.setImages(embed, attachment)
                await this.replaceMessage(sentMessage, embed, [attachment])
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

        const sentMessage = await this.channel.send({
            embeds: [embed1],
            files: [busAttachment],
        })
        const options = ReactionEmojis.HIGHER_LOWER
        const reaction = await this.getSingleReaction(
            this.bus.player,
            sentMessage,
            options,
        )

        const content = reaction.emoji.toString()
        const newCard = this.bus.getRandomCard()
        const correct =
            (Emoji.HIGHER.includes(content) && newCard > oldCard) ||
            (Emoji.LOWER.includes(content) && newCard < oldCard)

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
                message = `${this.bus.player} managed to escape the BUSS in ${this.bus.turns} turns, while consuming ${this.bus.totalDrinks} drinks in total`
            }
        } else if (newCard.equals(oldCard)) {
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
            `\n${this.bus.player} chose ` +
            '`' +
            `${EmojiStrings[content]}` +
            '`'
        embed1.addField(`Verdict`, message)

        const drawnCardAttachment = await this.drawnCardAttachment(newCard)
        busAttachment = await this.getBusAttachment(true, true)
        await this.setImages(embed1, busAttachment, drawnCardAttachment)
        const lastMessage = await this.replaceMessage(sentMessage, embed1, [
            busAttachment,
            drawnCardAttachment,
        ])

        this.bus.iterate(newCard, correct)
        if (!correct) {
            await this.getSingleReaction(this.bus.player, lastMessage, [
                Emoji.PLAY,
            ])
        }
        if (newBusPlayer) {
            this.bus.player = newBusPlayer
        }
    }

    passInput(oldPlayer, newPlayer): void {
        if (this.bus && this.bus.player.equals(oldPlayer)) {
            this.bus.player = newPlayer
            this.collector?.stop()
        }
    }

    //endregion
}

class Bus {
    player: Player
    deck: Deck
    size: number
    sequence: Array<Card>
    currentIndex: number

    discarded: Array<Card>

    checkpoints: Array<number>
    currentCheckpoint: number
    isFinished: boolean

    turns: number
    totalDrinks: number

    hidden: boolean
    maxIndex: number

    constructor(player, size, checkpoints, hidden) {
        this.player = player
        this.deck = new Deck(BussenCard)
        this.sequence = []
        this.size = size
        this.hidden = hidden

        for (let i = 0; i < size; i++) {
            this.sequence.push(this.deck.getRandomCard())
        }
        this.discarded = []
        this.currentIndex = 0
        this.checkpoints = [0]
        this.maxIndex = -1

        for (let i = 0; i < checkpoints; i++) {
            this.checkpoints.push(
                Math.floor((size / (checkpoints + 1)) * (i + 1)),
            )
        }

        this.currentCheckpoint = 0
        this.isFinished = false

        this.turns = 0
        this.totalDrinks = 0
    }

    get drinkCount() {
        return this.currentIndex + 1 - this.getCurrentCheckpoint()
    }

    incrementIndex(correct) {
        if (this.currentIndex > this.maxIndex) {
            this.maxIndex = this.currentIndex
        }

        if (correct) {
            this.currentIndex = (this.currentIndex + 1) % this.sequence.length
            if (
                this.checkpoints.includes(this.currentIndex - 1) &&
                this.getCurrentCheckpoint() < this.currentIndex - 1
            ) {
                this.currentCheckpoint += 1
            }

            if (this.currentIndex === 0) {
                this.isFinished = true
            }
        } else {
            this.currentIndex = this.getCurrentCheckpoint()
        }
    }

    getCurrentCheckpoint() {
        return this.checkpoints[this.currentCheckpoint]
    }

    getCurrentCard() {
        return this.sequence[this.currentIndex]
    }

    getRandomCard() {
        if (this.deck.isEmpty()) {
            this.deck.addCards(this.discarded)
            this.discarded = []
        }
        return this.deck.getRandomCard()
    }

    iterate(newCard, correct) {
        this.discarded.push(this.getCurrentCard())
        this.sequence[this.currentIndex] = newCard

        if (!correct) {
            this.totalDrinks = this.totalDrinks + this.drinkCount
        }
        this.incrementIndex(correct)
        this.turns++
    }

    cardPrinterParams(focus = false, showDrawn?) {
        const rows = createRows(this.sequence, this.checkpoints)
        const centered = [true]
        let focused
        let focusIndex
        let hidden
        let hiddenIndex

        if (focus) {
            focused = []
            focusIndex = this.currentIndex
        }

        if (this.hidden) {
            hidden = []
            hiddenIndex =
                showDrawn && this.currentIndex > this.maxIndex
                    ? this.maxIndex + 1
                    : this.maxIndex
        }

        if (
            typeof focusIndex !== 'undefined' ||
            typeof hiddenIndex !== 'undefined'
        ) {
            let curr = 0
            for (const row of rows) {
                const rowFocused = []
                const rowHidden = []

                for (let i = 0; i < row.length; i++) {
                    if (curr === focusIndex) {
                        rowFocused.push(i)
                    }

                    if (curr > hiddenIndex) {
                        rowHidden.push(true)
                    } else {
                        rowHidden.push(false)
                    }

                    curr += 1
                }

                if (focus) {
                    focused.push(rowFocused)
                }
                if (hidden) {
                    hidden.push(rowHidden)
                }
            }
        }

        return { rows, centered, focused, hidden }
    }
}

class Pyramid {
    deck: Deck
    reversed: boolean
    size: number
    cards: Array<Card>
    index: number
    rows: Array<number>

    constructor(deck, reversed, size) {
        this.deck = deck
        this.reversed = reversed
        this.size = size
        this.cards = []
        this.rows = []

        let index = 0
        if (!reversed) {
            for (let i = 0; i < size; i++) {
                this.rows.push(index)
                for (let j = 0; j <= i; j++) {
                    this.cards.push(deck.getRandomCard())
                    index++
                }
            }
        } else {
            for (let i = size; i > 0; i--) {
                this.rows.push(index)
                for (let j = 0; j < i; j++) {
                    this.cards.push(deck.getRandomCard())
                    index++
                }
            }
        }

        this.index = 0
    }

    isEmpty() {
        return this.index >= this.cards.length
    }

    getNextCard() {
        if (!this.isEmpty()) {
            const drinks = this.getDrinkCounts(this.index)
            const card = this.cards[this.cards.length - 1 - this.index]
            this.index++
            return { card, drinks }
        }
    }

    getDrinkCounts(index) {
        if (this.reversed) {
            for (let i = 0; i < this.size; i++) {
                if (sum(i) <= index && index < sum(i + 1)) {
                    return i + 1
                }
            }
        } else {
            let totalIndex = 0
            for (let i = this.size; i > 0; i--) {
                for (let j = 0; j < i; j++) {
                    if (totalIndex === index) {
                        return this.size - (i - 1)
                    }
                    totalIndex++
                }
            }
        }
        return -1
    }
}

class BussenCard extends Card {
    CardValueMap: Record<Value, number> = {
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        Jack: 11,
        Queen: 12,
        King: 13,
        Ace: 14,
    }
}
