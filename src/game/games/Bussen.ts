import Discord, { MessageEmbed, MessageReaction } from 'discord.js'

import { CardPrinter } from '../../utils/CardPrinter'
import {
    EmptyString,
    ReactionEmojis,
    StringCouples,
    Strings,
    Value,
} from '../../utils/Consts'
import { Emoji } from '../../utils/Emoji'
import {
    getReactionsCollector,
    reactOptions,
    removeMessage,
    sum,
} from '../../utils/Utils'
import { Card, Deck } from '../Deck'
import { Game } from '../Game'

const pluralize = require(`pluralize`)

const StringState = {
    EQUAL: (player, card, drinks) =>
        `${player} drew ${card} and everyone has to consume ${pluralize(
            'drink',
            drinks,
            true,
        )}`,
    TRUE: (player, card) => `${player} drew ${card} and was correct`,
    FALSE: (player, card, drinks) =>
        `${player} drew ${card} and has to consume ${pluralize(
            'drink',
            drinks,
            true,
        )}`,
}

export default class Bussen extends Game {
    drinks: number
    pyramid: Pyramid
    bus: Bus
    busPlayers: Array<any>

    constructor(name, leader, channel) {
        super(name, leader, channel)
        this.deck = new Deck(BussenCard)
        this.drinks = 1
    }

    onRemovePlayer(player) {
        // if removed player is in the bus, swap for new player
        if (this.bus && player.equals(this.bus.player)) {
            const newPlayer = this.getNewBusPlayer()
            if (newPlayer) {
                this.bus.player = newPlayer
                return `Because ${player} was in the bus, ${newPlayer} is now chosen to be the bus driver`
            }
        }
    }

    async game() {
        // Phase 1 questions
        await this.askAllPlayers(this.askColour)
        await this.askAllPlayers(this.askHigherLower)
        await this.askAllPlayers(this.askBetween)
        await this.askAllPlayers(this.askSuit)

        // Phase 2 Pyramid
        await this.ask(this.iniPyramid)
        await this.askWhile(
            () =>
                this.pyramid &&
                !this.pyramid.isEmpty() &&
                !this.noOneHasCards(),
            this.plaPyramid,
        )

        // Phase 3 The Bus
        await this.ask(this.iniBus)
        /* await this.askWhile(
            () => this.bus && !this.bus.isFinished,
            this.playBus,
        )*/

        // Phase 2 pyramid
        /*await this.initPyramid()
        await this.askWhile(
            () =>
                this.pyramid &&
                !this.pyramid.isEmpty() &&
                !this.noOneHasCards(),
            this.playPyramid,
        )*/

        // Phase 3 The Bus
        /*await this.ask(this.initBus)
        await this.askWhile(
            () => this.bus && !this.bus.isFinished,
            this.playBus,
        )*/
    }

    async getAttachment(name, cards, text?, rows?, center?, cardCount?) {
        const playerCardPrinter = new CardPrinter(
            cards,
            rows,
            center,
            text,
            cardCount,
        )
        await playerCardPrinter.printCards()

        return new Discord.MessageAttachment(
            playerCardPrinter.canvas.toBuffer('image/png'),
            name,
        )
    }

    getMessage(isEqual, isTrue, player, card) {
        return isEqual
            ? StringState.EQUAL(player, card, this.drinks)
            : isTrue
            ? StringState.TRUE(player, card)
            : StringState.FALSE(player, card, this.drinks)
    }

    //region Phase 1

    async createEmbed(player, question, card?, verdict?) {
        const attachments = []
        if (player.cards.length > 0) {
            const playerCardAttachment = await this.getAttachment(
                `pcards.png`,
                player.cards,
                `Your Cards`,
            )
            attachments.push(playerCardAttachment)
        }

        if (card) {
            const drawnCardAttachment = await this.getAttachment(
                `dcard.png`,
                [card],
                `Drawn`,
            )
            attachments.push(drawnCardAttachment)
        }

        const embed = new MessageEmbed()
            .setTitle(`${player.username}'s turn`)
            .setDescription(`${player}, ${question}`)

        if (attachments.length > 0) {
            embed.attachFiles(attachments).setImage(`attachment://pcards.png`)
        }

        if (card) {
            embed
                .setThumbnail(`attachment://dcard.png`)
                .addField(`Verdict`, verdict)
        }

        return embed
    }

    async addVerdict(sentMessage, isTrue, player, question, card) {
        const verdict = this.getMessage(false, isTrue, player, card)
        const embed2 = await this.createEmbed(player, question, card, verdict)

        await removeMessage(sentMessage)
        await this.channel.send(embed2)
    }

    async askColour(player) {
        const question = `red or black?`
        const embed1 = await this.createEmbed(player, question)
        const sentMessage = await this.channel.send(embed1)

        const reaction = (await this.getSingleReaction(
            player,
            sentMessage,
            ReactionEmojis.RED_BLACK,
        )) as MessageReaction

        const card = this.deck.getRandomCard()
        player.addCard(card)

        const content = reaction.emoji.name

        const isTrue =
            (content.includes(Emoji.HEARTS) && card.isRed()) ||
            (content.includes(Emoji.SPADES) && card.isBlack())

        await this.addVerdict(sentMessage, isTrue, player, question, card)
    }

    async askHigherLower(player) {
        const playerCard = player.cards[0]
        const question = `higher or lower than ${playerCard}?`
        const embed1 = await this.createEmbed(player, question)
        const sentMessage = await this.channel.send(embed1)

        const reaction = (await this.getSingleReaction(
            player,
            sentMessage,
            ReactionEmojis.HIGHER_LOWER,
        )) as MessageReaction
        const card = this.deck.getRandomCard()

        const content = reaction.emoji.name
        const isTrue =
            (Emoji.HIGHER.includes(content) && card > playerCard) ||
            (Emoji.LOWER.includes(content) && card < playerCard)

        player.addCard(card)

        await this.addVerdict(sentMessage, isTrue, player, question, card)
    }

    async askBetween(player) {
        const playerCard1 = player.cards[0]
        const playerCard2 = player.cards[1]

        const question = `is it between ${playerCard1} and ${playerCard2}?`
        const embed1 = await this.createEmbed(player, question)
        const sentMessage = await this.channel.send(embed1)

        const reaction = (await this.getSingleReaction(
            player,
            sentMessage,
            ReactionEmojis.YES_NO,
        )) as MessageReaction

        const card = this.deck.getRandomCard()
        player.addCard(card)

        const content = reaction.emoji.name

        const isBetween = card.isBetween(playerCard1, playerCard2)
        const isTrue =
            (Emoji.YES.includes(content) && isBetween) ||
            (Emoji.NO.includes(content) && !isBetween)

        await this.addVerdict(sentMessage, isTrue, player, question, card)
    }

    async askSuit(player) {
        const playerSuits = [
            ...new Set(player.cards.map(cards => cards.suit)),
        ].join(', ')

        const question = `do you already have the suit, you have ${playerSuits}?`
        const embed1 = await this.createEmbed(player, question)
        const sentMessage = await this.channel.send(embed1)

        const reaction = (await this.getSingleReaction(
            player,
            sentMessage,
            ReactionEmojis.YES_NO,
        )) as MessageReaction

        const card = this.deck.getRandomCard()

        const content = reaction.emoji.name
        const hasSameSuit = card.hasSameSuit(player.cards)

        const isTrue =
            (Emoji.YES.includes(content) && hasSameSuit) ||
            (Emoji.NO.includes(content) && !hasSameSuit)

        player.addCard(card)

        await this.addVerdict(sentMessage, isTrue, player, question, card)
    }
    //endregion

    //region Phase 2 Pyramid

    async iniPyramid() {
        const deckSize = this.deck.cards.length
        let maxSize
        for (let i = 1; i < 12; i++) {
            if (sum(i) <= deckSize) {
                maxSize = i
            }
        }

        const sizeOptions = ReactionEmojis.HIGHER_LOWER2
        let pyramidSize = 1

        const embed = new MessageEmbed()
            .setTitle(`Pyramid`)
            .setDescription(
                `${this.leader}, how tall should the pyramid be? (1-${maxSize})`,
            )
            .addField(`Pyramid Size`, `${pyramidSize}`, true)

        let sentMessage = await this.channel.send(embed)
        const sizeCollector = getReactionsCollector(
            this.leader,
            sentMessage,
            sizeOptions,
        )

        const col = this.waitForValue(
            sizeCollector,
            pyramidSize,
            1,
            maxSize,
            sentMessage,
            embed,
            embed.fields[0],
        )

        await reactOptions(sentMessage, sizeOptions)

        pyramidSize = await col

        embed
            .setDescription(`${this.leader}, should the pyramid be reversed?`)
            .addField(`Reversed`, EmptyString, true)

        await removeMessage(sentMessage)
        sentMessage = await this.channel.send(embed)

        const reverseOptions = ReactionEmojis.YES_NO
        const collected = (await this.getSingleReaction(
            this.leader,
            sentMessage,
            reverseOptions,
        )) as MessageReaction

        const reverseEmoji = collected.emoji.name
        const reverse = Emoji.YES.includes(reverseEmoji)

        this.pyramid = new Pyramid(this.deck, reverse, pyramidSize)

        const attachment = await this.getAttachment(
            `pyramid.png`,
            this.pyramid.cards,
            ``,
            this.pyramid.rows,
            true,
            0,
        )
        embed.fields[1].value = `${reverse ? Emoji.YES : Emoji.NO}`
        embed.attachFiles([attachment]).setImage(`attachment://pyramid.png`)

        await removeMessage(sentMessage)
        await this.channel.send(embed)
    }

    async plaPyramid() {
        const { card, drinks } = this.pyramid.getNextCard()

        const pyramidAttachment = await this.getAttachment(
            `pyramid.png`,
            this.pyramid.cards,
            ``,
            this.pyramid.rows,
            true,
            this.pyramid.index,
        )

        const drawnCardAttachment = await this.getAttachment(
            `dcard.png`,
            [card],
            `Drawn`,
        )

        let message = `Drew ${card}\n`
        for (const player of this.players) {
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
            .attachFiles([pyramidAttachment, drawnCardAttachment])
            .setImage(`attachment://pyramid.png`)
            .setThumbnail(`attachment://dcard.png`)

        const sentMessage = await this.channel.send(embed)

        await this.getSingleReaction(this.leader, sentMessage, [Emoji.PLAY])
    }

    //endregion

    //region Phase 3 Bus
    getNewBusPlayer() {
        let newPlayer
        if (this.busPlayers.length > 0) {
            const index = Math.floor(Math.random() * this.busPlayers.length)
            newPlayer = this.busPlayers[index]
            this.busPlayers.splice(index, 1)
        } else {
            newPlayer = this.players[
                Math.floor(Math.random() * this.players.length)
            ]
        }
        return newPlayer
    }

    async iniBus() {
        const maxCards = Math.max(
            ...this.players.map(player => player.cards.length),
        )
        this.busPlayers = this.players.filter(
            player => player.cards.length === maxCards,
        )
        const busPlayer = this.busPlayers[
            Math.floor(Math.random() * this.busPlayers.length)
        ]
        const message = `${this.busPlayers.join(
            ', ',
        )} all have ${maxCards} cards, but ${busPlayer} has been selected as the bus driver!`

        // Removing chosen player from options
        const index = this.busPlayers.indexOf(busPlayer)
        if (index > -1) {
            this.busPlayers.splice(index, 1)
        }

        // removing all players' cards, because they dont use them in the bus
        for (const player of this.players) {
            player.removeAllCards()
        }

        const sizeOptions = ReactionEmojis.HIGHER_LOWER2
        let busSize = 1
        const embed = new MessageEmbed()
            .setTitle(`The BUSSS`)
            .setDescription(message)
            .addField(
                EmptyString,
                `${busPlayer}, how long should the bus be? (1-20)`,
            )
            .addField(`Bus Size`, `${busSize}`, true)

        const sentMessage = await this.channel.send(embed)
        const busSizeCollector = getReactionsCollector(
            busPlayer,
            sentMessage,
            sizeOptions,
        )

        const col = this.waitForValue(
            busSizeCollector,
            busSize,
            1,
            20,
            sentMessage,
            embed,
            embed.fields[1],
        )

        await reactOptions(sentMessage, sizeOptions)

        busSize = await col

        let checkpoints = 0
        if (busSize > 2) {
            const maxCheckPoints = Math.floor(busSize / 3)
            embed.fields[0].value = `${busPlayer}, how many checkpoints should the bus have? (0-${maxCheckPoints})`
            embed.addField(`Checkpoints`, `${checkpoints}`, true)
            await sentMessage.edit(embed)

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
                embed.fields[2],
            )
        }

        if (busSize) {
            this.bus = new Bus(busPlayer, busSize, checkpoints)
        }
    }

    async playBus() {
        const oldCard = this.bus.getCurrentCard()
        const newCard = this.bus.getRandomCard()
        const content = await this.getResponse(
            this.bus.player,
            `Card ${this.bus.currentIndex + 1} is ${oldCard}, higher or lower?`,
            StringCouples.HIGHER_LOWER,
        )

        const correct =
            (content === 'higher' && newCard > oldCard) ||
            (content === 'lower' && newCard < oldCard)

        let message
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
        } else {
            message = `${this.bus.player} drew ${newCard}, has to consume ${
                this.bus.currentIndex + 1 - this.bus.getCurrentCheckpoint()
            } drinks and resets to card ${this.bus.getCurrentCheckpoint() + 1}`
        }

        await this.channel.send(message)
        this.bus.iterate(newCard, correct)
    }

    //endregion
}

class Bus {
    player: any
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

    constructor(player, size, checkpoints) {
        this.player = player
        this.deck = new Deck(BussenCard)
        this.sequence = []
        this.size = size

        for (let i = 0; i < size; i++) {
            this.sequence.push(this.deck.getRandomCard())
        }
        this.discarded = []
        this.currentIndex = 0
        this.checkpoints = [0]

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

    incrementIndex(correct) {
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
            this.totalDrinks = this.totalDrinks + this.currentIndex + 1
        }
        this.incrementIndex(correct)
        this.turns++
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
