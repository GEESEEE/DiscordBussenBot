const {Deck, Card} = require('./Deck')

class Bussen {

    constructor(leader) {
        this.deck = new Deck()
        this.players = [leader]
        this.hasStarted = false
    }

    isLeader(player) {
        return this.players[0].id === player.id
    }

    addPlayer(player) {
        this.players.push(player)
    }

    leader() {
        return this.players[0]
    }

    filter(user, answer) {
        return m => answer.test(m.content) && m.author.id === user.id
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


    async askColours() {
        for (const player of this.players) {
            this.channel.send(`${player} red or black? (red/black)`)

            const message = (await this.channel.awaitMessages(this.filter(player, /(^red|black)$/i), {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()
            player.addCard(card)

            if ((content === "red" && card.isRed()) || (content === "black" && card.isBlack())) {
                this.channel.send(`${player} drew a ${card} and was correct`)
            } else {
                this.channel.send(`${player} drew a ${card} and has to consume 1 drink`)
            }

        }
    }

    async askHigherLower(player, deck, card) {
        this.channel.send(`${player} higher or lower than a ${card}? (higher/lower)`)

        const message = (await this.channel.awaitMessages(this.filter(player, /^(higher|lower)$/i), {max: 1})).first()
        const content = message.content.toLowerCase()
        const newCard = this.deck.getRandomCard()

        if ((content === "higher" && newCard > card) || (content === "lower" && newCard < card) ) {
            this.channel.send(`${player} drew a ${newCard} and was correct`)
        } else if (card.equals(newCard)) {
            this.channel.send(`${player} drew a ${newCard} and everyone has to consume 1 drink`)
        } else {
            this.channel.send(`${player} drew a ${newCard} and has to consume 1 drink`)
        }

        return newCard
    }

    async askHigherOrLower() {
        for (const player of this.players) {
            const playerCard = player.cards[0]
            const newCard = await this.askHigherLower(player, this.deck, playerCard)
            player.addCard(newCard)
        }
    }

    async askInBetween() {
        for (const player of this.players) {
            const playerCard1 = player.cards[0]
            const playerCard2 = player.cards[1]
            this.channel.send(`${player} is it between a ${playerCard1} and a ${playerCard2}? (yes/no)`)

            const message = (await this.channel.awaitMessages(this.filter(player, /^(yes|no)$/i), {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()
            player.addCard(card)

            if (card.equals(playerCard1) || card.equals(playerCard2)){
                this.channel.send(`${player} drew a ${card} and everyone has to consume 1 drink`)
            } else if ((content === "yes" && card.isBetween(playerCard1, playerCard2))
                || (content === "no" && !card.isBetween(playerCard1, playerCard2)) ) {

                this.channel.send(`${player} drew a ${card} and was correct`)

            } else {
                this.channel.send(`${player} drew a ${card} and has to consume 1 drink`)
            }

        }
    }

    async askSuits() {
        for (const player of this.players) {
            const playerSuits = player.cards.map(cards => cards.suit).join(", ")
            this.channel.send(`${player} do you already have the suit, you have ${playerSuits}? (yes/no)`)

            const message = (await this.channel.awaitMessages(this.filter(player, /^(yes|no)$/i), {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()

            if ((content === "yes" && card.hasSameSuit(player.cards))
                || (content === "no" && !card.hasSameSuit(player.cards)) ) {

                if (content === "no" && player.suitsCount() === 4) {
                    this.channel.send(`${player} drew a ${card} and was correct and everyone has to consume 2 drinks`)
                } else {
                    this.channel.send(`${player} drew a ${card} and was correct`)
                }

            } else {
                this.channel.send(`${player} drew a ${card} and has to consume 1 drink`)
            }

            player.addCard(card)
        }
    }

    async initPyramid() {
        const leader = this.leader()
        this.channel.send(`${leader} how tall should the pyramid be? [1-9]`)

        const sizeMessage = (await this.channel.awaitMessages(this.filter(leader, /^[1-9]$/), {max: 1})).first()
        const pyramidSize = sizeMessage.content
        console.log(pyramidSize)

        this.channel.send(`${leader} should the pyramid be reversed? (yes/no)`)
        const reverseMessage = (await this.channel.awaitMessages(this.filter(leader, /^(yes|no)$/i), {max: 1})).first()

        this.pyramid = null
        if (reverseMessage.content === "yes") {
            this.pyramid = new Pyramid(this.deck, true, parseInt(pyramidSize))
        } else {
            this.pyramid = new Pyramid(this.deck, false, parseInt(pyramidSize))
        }

    }

    async playPyramid() {
        this.channel.send(`${this.leader()}, you should type 'next' to draw the next card after everyone has had their drinks`)
        while (!this.pyramid.isEmpty()) {
            if (!this.pyramid.isFull()) {
                await this.channel.awaitMessages(this.filter(this.leader(), /^(next)$/i), {max: 1})
            }

            const {card, drinks} = this.pyramid.getNextCard()
            console.log(drinks)
            this.channel.send(`A ${card} was drawn`)
            for (const player of this.players) {

                if (player.hasValueInHand(card)) {
                    const playerCards = player.getCardsWithValue(card)
                    const playerCardsString = playerCards.join(", ")
                    this.channel.send(`${player} put down ${playerCardsString} and can give ${drinks * playerCards.length} drinks to other players. Cards left: ${player.cards.length}`)

                } else {
                    this.channel.send(`${player} has no card with value ${card.value} to put down. Cards left: ${player.cards.length}`)
                }
            }
        }

    }

    async initBus() {
        console.log("init bus")
        const maxCards = Math.max.apply(null, this.players.map(player => player.cards.length))
        const busPlayers = this.players.filter(player => player.cards.length === maxCards)
        const busPlayersString = busPlayers.join(", ")
        this.channel.send(`${busPlayersString} were selected as options for the bus, as they all have ${maxCards} cards`)

        const randomPlayerIndex = Math.floor(Math.random() * busPlayers.length)
        const player = busPlayers[randomPlayerIndex]
        this.channel.send(`${player} has been selected as the player to go into the bus!`)

        for (const player of this.players) {
            player.removeAllCards()
        }

        this.channel.send(`${player} how long should the bus be? [1-19]`)
        const regex = /^(?:[1-9]|1[0-9])$/
        const message = (await this.channel.awaitMessages(this.filter(player, regex), {max: 1} ) ).first()
        const busSize = parseInt(message.content)

        this.bus = new Bus(player, busSize)
    }

    async playBus() {
        //this.channel.send(`${this.leader()} is the dealer for the bus, he should type 'next' to deal the next card.`)
        while (!this.bus.isFinished) {

            const oldCard = this.bus.getCurrentCard()
            this.channel.send(`${this.bus.player},  Card ${this.bus.currentIndex + 1} is ${oldCard}, higher or lower? (higher/lower)`)

            const message = (await this.channel.awaitMessages(this.filter(this.bus.player, /(higher|lower)/i), {max : 1} )).first()
            const newCard = this.bus.getRandomCard()
            console.log(`${oldCard} asd ${newCard}`)
            const correct = (message.content === "higher" && newCard > oldCard) || (message.content === "lower" && newCard < oldCard )
            if (correct) {
                this.channel.send(`${this.bus.player} drew a ${newCard} and can advance to card ${this.bus.currentIndex + 2} `)
            } else {
                this.channel.send(`${this.bus.player} drew a ${newCard}, has to consume ${this.bus.currentIndex + 1} drinks and resets to the first card`)
            }
            this.bus.iterate(newCard, correct)


        }
        this.channel.send(`${this.bus.player} managed to escape the BUSS in ${this.bus.turns} and while consuming ${this.bus.totalDrinks} drinks in total`)
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

        if (correct) {
            this.totalDrinks = this.totalDrinks + this.currentIndex
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