import { StringCouples, Strings, Suit, Value } from '../../utils/Consts'
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
        await this.askAllPlayers(this.askColours)
        await this.askAllPlayers(this.askHigherOrLower)
        await this.askAllPlayers(this.askInBetween)
        await this.askAllPlayers(this.askSuits)

        // Phase 2 pyramid
        await this.initPyramid()
        await this.askWhile(
            () => this.pyramid && !this.pyramid.isEmpty(),
            this.playPyramid,
        )

        // Phase 3 The Bus
        await this.ask(this.initBus)
        await this.askWhile(
            () => this.bus && !this.bus.isFinished,
            this.playBus,
        )
    }

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

    getMessage(isEqual, isTrue, player, card) {
        return isEqual
            ? StringState.EQUAL(player, card, this.drinks)
            : isTrue
            ? StringState.TRUE(player, card)
            : StringState.FALSE(player, card, this.drinks)
    }

    async askColours(player) {
        const content = await this.getResponse(
            player,
            `red or black?`,
            StringCouples.RED_BLACK,
        )
        const card = this.deck.getRandomCard()
        player.addCard(card)

        const isTrue =
            (content === 'red' && card.isRed()) ||
            (content === 'black' && card.isBlack())
        await this.channel.send(this.getMessage(false, isTrue, player, card))
    }

    async askHigherOrLower(player) {
        const playerCard = player.cards[0]
        const content = await this.getResponse(
            player,
            `higher or lower than ${playerCard}?`,
            StringCouples.HIGHER_LOWER,
        )
        const newCard = this.deck.getRandomCard()

        const isTrue =
            (content === 'higher' && newCard > playerCard) ||
            (content === 'lower' && newCard < playerCard)
        await this.channel.send(
            this.getMessage(
                playerCard.equals(newCard),
                isTrue,
                player,
                newCard,
            ),
        )
        player.addCard(newCard)
    }

    async askInBetween(player) {
        const playerCard1 = player.cards[0]
        const playerCard2 = player.cards[1]
        const content = await this.getResponse(
            player,
            `is it between ${playerCard1} and ${playerCard2}?`,
            StringCouples.YES_NO,
        )

        const card = this.deck.getRandomCard()
        player.addCard(card)

        const isBetween = card.isBetween(playerCard1, playerCard2)
        const isTrue =
            (content === 'yes' && isBetween) || (content === 'no' && !isBetween)
        await this.channel.send(
            this.getMessage(
                card.equals(playerCard1) || card.equals(playerCard2),
                isTrue,
                player,
                card,
            ),
        )
    }

    async askSuits(player) {
        const playerSuits = [
            ...new Set(player.cards.map(cards => cards.suit)),
        ].join(', ')
        const content = await this.getResponse(
            player,
            `do you already have the suit, you have ${playerSuits}?`,
            StringCouples.YES_NO,
        )

        const card = this.deck.getRandomCard()

        const hasSameSuit = card.hasSameSuit(player.cards)
        const isTrue =
            (content === 'yes' && hasSameSuit) ||
            (content === 'no' && !hasSameSuit)
        await this.channel.send(
            this.getMessage(
                isTrue && content === 'no' && player.suitsCount() === 3,
                isTrue,
                player,
                card,
            ),
        )

        player.addCard(card)
    }

    async initPyramid() {
        const pyramidSize = await this.loopForResponse(
            this.leader,
            `how tall should the pyramid be?`,
            `1,9`,
            true,
        )
        const reverseContent = await this.loopForResponse(
            this.leader,
            `should the pyramid be reversed?`,
            StringCouples.YES_NO,
        )

        if (pyramidSize && reverseContent) {
            this.pyramid = new Pyramid(
                this.deck,
                reverseContent === 'yes',
                pyramidSize,
            )
        }
    }

    async playPyramid() {
        await this.getResponse(
            this.leader,
            `type 'next' to draw the next card`,
            Strings.NEXT,
        )
        const { card, drinks } = this.pyramid.getNextCard()

        let message = `Drew ${card}\n`
        for (const player of this.players) {
            if (player.hasValueInHand(card)) {
                const playerCards = player.getCardsWithValue(card)
                const playerCardsString = playerCards.join(', ')
                message += `${player} put down ${playerCardsString} and can give ${
                    drinks * playerCards.length
                } drinks to other players.`
            } else {
                message += `${player} has no card with value ${card.value} to put down.`
            }
            message += ` Cards left: ${player.cards.length}\n`
        }
        await this.channel.send(message)
    }

    async initBus() {
        const maxCards = Math.max(
            ...this.players.map(player => player.cards.length),
        )
        this.busPlayers = this.players.filter(
            player => player.cards.length === maxCards,
        )
        let busPlayer = this.busPlayers[
            Math.floor(Math.random() * this.busPlayers.length)
        ]
        await this.channel.send(
            `${this.busPlayers.join(
                ', ',
            )} all have ${maxCards} cards, but ${busPlayer} has been selected as the bus driver!`,
        )

        // Removing chosen player from options
        const index = this.busPlayers.indexOf(busPlayer)
        if (index > -1) {
            this.busPlayers.splice(index, 1)
        }

        // removing all players' cards, because they dont use them in the bus
        for (const player of this.players) {
            player.removeAllCards()
        }

        let busSize
        while (!busSize && this.hasPlayers()) {
            if (this.isPlayer(busPlayer)) {
                busSize = await this.loopForResponse(
                    busPlayer,
                    `how long should the bus be?`,
                    `1,20`,
                    true,
                )
            } else {
                busPlayer = this.getNewBusPlayer()
            }
        }

        let checkpoints = 0
        while (busSize > 1 && !checkpoints && this.hasPlayers()) {
            checkpoints = await this.loopForResponse(
                busPlayer,
                `how many checkpoints should the bus have?`,
                `0,${Math.floor(busSize / 3)}`,
                true,
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
                this.bus.currentIndex + 1
            } drinks and resets to card ${this.bus.getCurrentCheckpoint() + 1}`
        }

        await this.channel.send(message)
        this.bus.iterate(newCard, correct)
    }
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

    constructor(deck, reversed, size) {
        this.deck = deck
        this.reversed = reversed
        this.size = size
        this.cards = []
        if (reversed) {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j <= i; j++) {
                    this.cards.push(deck.getRandomCard())
                }
            }
        } else {
            for (let i = size; i > 0; i--) {
                for (let j = 0; j < i; j++) {
                    this.cards.push(deck.getRandomCard())
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
            const card = this.cards[this.index]
            this.index++
            return { card, drinks }
        }
    }

    getDrinkCounts(index) {
        if (this.reversed) {
            for (let i = 0; i < this.size; i++) {
                if (this.sum(i) <= index && index < this.sum(i + 1)) {
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

    sum(n) {
        return (Math.pow(n, 2) + n) / 2
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
