import { Channel, MessageCollector, TextChannel } from 'discord.js'
import { type } from 'os'

import { Card, Deck } from './Deck'
import { StringCouples, Strings, StringState, Value } from './utils/Consts'
import { createFuse, getFilter, getPrompt } from './utils/Utils'

export class Bussen {
    deck: Deck
    players: Array<any>
    hasStarted: boolean
    hasEnded: boolean
    drinks: number
    channel: TextChannel

    collector: MessageCollector & { player: any }

    pyramid: Pyramid

    bus: Bus
    busPlayers: Array<any>

    constructor(leader, channel) {
        this.deck = new Deck()
        this.players = []
        this.hasStarted = false
        this.drinks = 1
        this.channel = channel
        this.addPlayer(leader)

        let message = `Starting game with ${leader}\n`
        message += `Type '!join' to join the game\n`
        message += `${leader}, type '!play' to start the game when all players have joined`
        this.channel.send(message)
    }

    isLeader(player) {
        if (this.hasPlayers()) {
            return this.players[0].equals(player)
        } else {
            return null
        }
    }

    get leader() {
        return this.players[0]
    }

    addPlayer(player) {
        if (!this.isPlayer(player)) {
            player.removeAllCards()
            this.players.push(player)
        }
    }

    isPlayer(player) {
        return this.players.includes(player)
    }

    hasPlayers() {
        return this.isPlayer(this.leader)
    }

    async removePlayer(player) {
        // Stop the collector if it collects from the given player
        if (this.collector && player.equals(this.collector.player)) {
            this.collector.stop()
        }

        // Remove player
        const index = this.players.indexOf(player)
        if (index > -1) {
            this.players.splice(index, 1)
        }

        // Add removed player's cards to the deck
        this.deck.addCards(player.cards)
        player.removeAllCards()

        let message = `${player} decided to be a little bitch and quit the game\n`

        // if removed player is in the bus, swap for new player
        if (this.bus && player.equals(this.bus.player)) {
            const newPlayer = this.getNewBusPlayer()
            if (newPlayer) {
                this.bus.player = newPlayer
                message += `Because ${player} was in the bus, ${newPlayer} is now chosen to be the bus driver`
            }
        }

        await this.channel.send(message)

        if (!this.hasPlayers()) {
            return this.endGame()
        }
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

    async endGame() {
        this.hasEnded = true
        this.collector?.stop()
    }

    async play() {
        this.hasStarted = true
        await this.channel.send(`${this.leader} has started the Game!`)

        try {
            // Phase 1 questions
            await this.askColours()
            await this.askHigherOrLower()
            await this.askInBetween()
            await this.askSuits()

            // Phase 2 pyramid
            await this.initPyramid()
            await this.playPyramid()

            // Phase 3 The Bus
            await this.initBus()
            await this.playBus()
        } catch {}

        await this.channel.send(`The game has finished`)
    }

    async getResponse(player, string, responseOptions, numeric = false) {
        if (typeof responseOptions === 'string') {
            responseOptions = [responseOptions]
        }

        const fuse = createFuse(responseOptions, numeric)
        const prompt = `${player}, ${string} (${responseOptions.join('/')})`
        await this.channel.send(prompt)

        const { collector, message } = getPrompt(
            this.channel,
            getFilter(player, fuse),
        )
        this.collector = collector
        collector.player = player
        const res = await message

        if (!numeric) {
            return fuse.search(res.content)[0].item
        } else {
            return parseInt(res.content)
        }
    }

    async loopForResponse(player, string, responseOptions, numeric = false) {
        let succes
        let val
        while (!succes && this.isPlayer(player)) {
            try {
                val = await this.getResponse(
                    player,
                    string,
                    responseOptions,
                    numeric,
                )
                succes = true
            } catch {}
        }

        return val
    }

    getMessage(isEqual, isTrue, player, card) {
        return isEqual
            ? StringState.EQUAL(player, card, this.drinks)
            : isTrue
            ? StringState.TRUE(player, card)
            : StringState.FALSE(player, card, this.drinks)
    }

    isEnded() {
        if (this.hasEnded) {
            throw new Error(`Game has ended`)
        }
    }

    async askColours() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
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
                await this.channel.send(
                    this.getMessage(false, isTrue, player, card),
                )
            } catch {
                this.isEnded()
                i--
            }
        }
    }

    async askHigherOrLower() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
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
            } catch {
                this.isEnded()
                i--
            }
        }
    }

    async askInBetween() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
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
                    (content === 'yes' && isBetween) ||
                    (content === 'no' && !isBetween)
                await this.channel.send(
                    this.getMessage(
                        card.equals(playerCard1) || card.equals(playerCard2),
                        isTrue,
                        player,
                        card,
                    ),
                )
            } catch {
                this.isEnded()
                i--
            }
        }
    }

    async askSuits() {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i]
            try {
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
            } catch {
                this.isEnded()
                i--
            }
        }
    }

    async initPyramid() {
        const pyramidSize = await this.loopForResponse(
            this.leader,
            `how tall should the pyramid be?`,
            `1-9`,
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
        while (this.leader && this.pyramid && !this.pyramid.isEmpty()) {
            try {
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
            } catch {
                this.isEnded()
            }
        }
    }

    async initBus() {
        if (this.hasPlayers()) {
            try {
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

                // removing all players'  cards, because they dont use them in the bus
                for (const player of this.players) {
                    player.removeAllCards()
                }

                /*            const regex = /^(?:[1-9]|1[0-9])$/*/
                let busSize
                while (!busSize && this.leader) {
                    if (this.isPlayer(busPlayer)) {
                        busSize = await this.loopForResponse(
                            busPlayer,
                            `how long should the bus be?`,
                            `1-19`,
                            true,
                        )
                    } else {
                        busPlayer = this.getNewBusPlayer()
                    }
                }

                if (busSize) {
                    this.bus = new Bus(busPlayer, busSize)
                }
            } catch {
                this.isEnded()
            }
        }
    }

    async playBus() {
        while (this.leader && this.bus && !this.bus.isFinished) {
            try {
                const oldCard = this.bus.getCurrentCard()
                const newCard = this.bus.getRandomCard()
                const content = await this.getResponse(
                    this.bus.player,
                    `Card ${
                        this.bus.currentIndex + 1
                    } is ${oldCard}, higher or lower?`,
                    StringCouples.HIGHER_LOWER,
                )

                const correct =
                    (content === 'higher' && newCard > oldCard) ||
                    (content === 'lower' && newCard < oldCard)
                const message = correct
                    ? `${
                          this.bus.player
                      } drew ${newCard} and can advance to card ${
                          this.bus.currentIndex + 2
                      } `
                    : `${this.bus.player} drew ${newCard}, has to consume ${
                          this.bus.currentIndex + 1
                      } drinks and resets to the first card`

                await this.channel.send(message)
                this.bus.iterate(newCard, correct)
            } catch {
                this.isEnded()
            }
        }

        if (this.bus && this.isPlayer(this.bus.player)) {
            await this.channel.send(
                `${this.bus.player} managed to escape the BUSS in ${this.bus.turns} turns, while consuming ${this.bus.totalDrinks} drinks in total`,
            )
        }
    }
}

class Bus {
    player: any
    deck: any
    sequence: any

    discarded: Array<Card>
    currentIndex: number
    isFinished: boolean

    turns: number
    totalDrinks: number

    constructor(player, size) {
        this.player = player
        this.deck = new Deck()
        this.sequence = []

        for (let i = 0; i < size; i++) {
            this.sequence.push(this.deck.getRandomCard())
        }
        this.discarded = []
        this.currentIndex = 0
        this.isFinished = false

        this.turns = 0
        this.totalDrinks = 0
    }

    incrementIndex(correct) {
        if (correct) {
            this.currentIndex = (this.currentIndex + 1) % this.sequence.length
            if (this.currentIndex === 0) {
                this.isFinished = true
            }
        } else {
            this.currentIndex = 0
        }
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

    isFull() {
        return this.index === 0
    }

    getNextCard() {
        if (!this.isEmpty()) {
            const drinks = this.getDrinkCounts(this.index)
            const card = this.deck.getRandomCard()
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
