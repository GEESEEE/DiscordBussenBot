const {Deck, Card} = require('./Deck')
const {getPrompt, filter} = require('./utils/Utils')
const {Strings, StringCouples, StringState} = require('./utils/Consts')

class Bussen {

    constructor(leader) {
        this.deck = new Deck()
        this.players = [leader]
        this.hasStarted = false
        this.drinks = 1
    }

    isLeader(player) {
        if (this.players.length > 0) {
            return this.players[0].equals(player)
        } else {
            return null
        }

    }

    addPlayer(player) {
        this.players.push(player)
    }

    getPlayer(id) {
        for (const player of this.players) {
            if (player.id === id) {
                return player
            }
        }
        return null
    }

    isPlayer(player) {
        return this.players.includes(player)
    }

    removePlayer(player) {
        this.channel.send(`${player} decided to be a little bitch and quit the game`)
        const index = this.players.indexOf(player)
        if (index > -1) {
            this.players.splice(index, 1)
        }

        this.deck.addCards(player.cards)
        player.removeAllCards()

        if (this.bus && player.equals(this.bus.player)) {
            let newPlayer
            if (this.busPlayers.length > 0) {
                const index = Math.floor(Math.random() * this.busPlayers.length)
                newPlayer = this.busPlayers[index]
                this.busPlayers.splice(index, 1)

            } else {
                newPlayer = this.players[Math.floor(Math.random() * this.players.length)]
            }
            this.bus.player = newPlayer
            this.channel.send(`Because ${player} was in the bus, ${newPlayer} is now chosen to be the bus driver`)
        }

        if (this.players.length === 0) {
            delete this
        }
    }

    get leader() {
        return this.players[0]
    }

    async play(channel) {
        this.hasStarted = true
        this.channel = channel

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

        this.cleanUp()
    }

    async getResponse(player, string, responseOptions, regex = null, numeric=false) {
        if (typeof responseOptions === "string") {
            responseOptions = [responseOptions]
        }

        let prompt = `${player}, ${string} (${responseOptions.join("/")})`
        await this.channel.send(prompt)

        if (!regex) {
            regex = new RegExp(`^${numeric ? "[" : "("}${responseOptions.join("|")}${numeric ? "]" : ")"}$`, "i")
        }

        const {message, collector} = getPrompt(this.channel, filter(player, regex))
        this.collector = collector
        await message

        return numeric ? parseInt(message.content) : message.content.toLowerCase()
    }

    getMessage(isEqual, isTrue, player, card) {
        return isEqual
            ? StringState.EQUAL(player, card, this.drinks)
            : isTrue
                ? StringState.TRUE(player, card)
                : StringState.FALSE(player, card, this.drinks)
    }


    async askColours() {
        for (const player of this.players) {
            const content = await this.getResponse(player, `red or black?`, StringCouples.RED_BLACK)
            const card = this.deck.getRandomCard()
            player.addCard(card)

            const isTrue = (content === "red" && card.isRed()) || (content === "black" && card.isBlack())
            const message = this.getMessage(false, isTrue, player, card)

            await this.channel.send(message)
        }
    }


    async askHigherOrLower() {
        for (const player of this.players) {
            const playerCard = player.cards[0]
            const content = await this.getResponse(player, `higher or lower than a ${playerCard}?`, StringCouples.HIGHER_LOWER)
            const newCard = this.deck.getRandomCard()

            const isEqual = (content === "higher" && newCard > playerCard) || (content === "lower" && newCard < playerCard)
            const message = this.getMessage(isEqual, playerCard.equals(newCard), player, newCard)

            await this.channel.send(message)
            player.addCard(newCard)
        }
    }

    async askInBetween() {
        for (const player of this.players) {
            const playerCard1 = player.cards[0]
            const playerCard2 = player.cards[1]
            const content = await this.getResponse(player, `is it between a ${playerCard1} and a ${playerCard2}?`, StringCouples.YES_NO)

            const card = this.deck.getRandomCard()
            player.addCard(card)

            const isBetween = card.isBetween(playerCard1, playerCard2)
            const isTrue = (content === "yes" && isBetween) || (content === "no" && !isBetween)
            const message = this.getMessage(card.equals(playerCard1) || card.equals(playerCard2), isTrue, player, card)

            await this.channel.send(message)
        }
    }

    async askSuits() {
        for (const player of this.players) {
            const playerSuits = [...new Set(player.cards.map(cards => cards.suit))].join(", ")
            const content = await this.getResponse(player, `do you already have the suit, you have ${playerSuits}?`, StringCouples.YES_NO)

            const card = this.deck.getRandomCard()

            const hasSameSuit = card.hasSameSuit(player.cards)
            const isTrue = (content === "yes" && hasSameSuit || content === "no" && !hasSameSuit)
            const message = this.getMessage(isTrue && content === "no" && player.suitsCount() === 3, isTrue, player, card)
            await this.channel.send(message)

            player.addCard(card)
        }
    }

    async initPyramid() {
        const pyramidSize = await this.getResponse(this.leader, `how tall should the pyramid be?`, `1-9`,null, true)
        const reverseContent = await this.getResponse(this.leader, `should the pyramid be reversed?`, StringCouples.YES_NO)
        this.pyramid = new Pyramid(this.deck, (reverseContent === "yes"), pyramidSize)
    }

    async playPyramid() {

        while (!this.pyramid.isEmpty()) {
            await this.getResponse(this.leader, `you should type 'next' to draw the next card after everyone has had their drinks`, Strings.NEXT)

            const {card, drinks} = this.pyramid.getNextCard()

            let message = `${card} was drawn\n`
            for (const player of this.players) {

                if (player.hasValueInHand(card)) {
                    const playerCards = player.getCardsWithValue(card)
                    const playerCardsString = playerCards.join(", ")
                    message += `${player} put down ${playerCardsString} and can give ${drinks * playerCards.length} drinks to other players. Cards left: ${player.cards.length}\n`

                } else { message += `${player} has no card with value ${card.value} to put down. Cards left: ${player.cards.length}`}

            }
            await this.channel.send(message)
        }

    }

    async initBus() {
        const maxCards = Math.max(...this.players.map(player => player.cards.length))
        this.busPlayers = this.players.filter(player => player.cards.length === maxCards)
        const player = this.busPlayers[Math.floor(Math.random() * this.busPlayers.length)]
        await this.channel.send(`${this.busPlayers.join(", ")} all have ${maxCards} cards, but ${player} has been selected as the bus driver!`)

        // Removing chosen player from options
        const index = this.busPlayers.indexOf(player)
        if (index > -1) {
            this.busPlayers.splice(index, 1)
        }

        // removing all player cards, because they dont use them in the bus
        for (const player of this.players) {
            player.removeAllCards()
        }

        const regex = /^(?:[1-9]|1[0-9])$/
        const busSize = await this.getResponse(player, `how long should the bus be?`, `1-19`, regex, true)

        this.bus = new Bus(player, busSize)
    }

    async playBus() {
        while (!this.bus.isFinished) {
            const oldCard = this.bus.getCurrentCard()
            const newCard = this.bus.getRandomCard()
            const content = await this.getResponse(this.bus.player, `Card ${this.bus.currentIndex + 1} is ${oldCard}, higher or lower?`, StringCouples.HIGHER_LOWER)

            const correct = (content === "higher" && newCard > oldCard) || (content === "lower" && newCard < oldCard )
            const message = correct
                ? `${this.bus.player} drew a ${newCard} and can advance to card ${this.bus.currentIndex + 2} `
                : `${this.bus.player} drew a ${newCard}, has to consume ${this.bus.currentIndex + 1} drinks and resets to the first card`

            await this.channel.send(message)
            this.bus.iterate(newCard, correct)

        }
        await this.channel.send(`${this.bus.player} managed to escape the BUSS in ${this.bus.turns} turns, while consuming ${this.bus.totalDrinks} drinks in total`)
    }

    cleanUp() {
        this.deck = new Deck()
        this.hasStarted = false
        for (const player of this.players) {
            player.removeAllCards()
        }
    }


}

class Bus {

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
        console.log(this.currentIndex)
        this.turns++

    }


}

class Pyramid {

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

        this.index = 0;

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
            return {card, drinks}
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
                        return this.size - (i - 1);
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



module.exports = Bussen