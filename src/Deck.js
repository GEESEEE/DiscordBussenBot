const {Suits, Values} = require("./utils/Consts")

class Deck {

    constructor() {
        this.deck = []

        for (const value of Object.values(Values)) {
            for (const suit of Object.values(Suits)) {
                const card = new Card(value, suit)
                this.deck.push(card)
            }
        }

    }

    addCard(card) {
        this.deck.push(card)
    }

    removeCard(card) {
        const index = this.deck.indexOf(card)
        if (index > -1) {
            this.deck.splice(index, 1)
        }
    }

    isEmpty() {
        return this.deck.length === 0
    }

    getRandomCard() {
        if (!this.isEmpty()) {
            const index = Math.floor(Math.random() * this.deck.length)
            const card = this.deck[index]
            this.removeCard(card)
            return card

        } else {
            return null
        }
    }
}

class Card {

    constructor(value, suit) {
        this.value = value
        this.suit = suit
    }

    valueOf() {
        const entry = Object.entries(Values).find(entry => entry[1] === this.value)
        return Object.entries(Values).indexOf(entry)
    }

    equals(card) {
        return this.valueOf() === card.valueOf()
    }

    isBetween(card1, card2) {
        return card1 < this.valueOf() && this.valueOf() < card2
    }

    isRed() {
        return this.suit === Suits.DIAMONDS || this.suit === Suits.HEARTS
    }

    isBlack() {
        return this.suit === Suits.CLUBS || this.suit === Suits.SPADES
    }

    hasSameSuit(cards) {
        for (const card of cards) {
            if (card.suit === this.suit) {
                return true
            }
        }
        return false
    }

    toString() {
        return `${this.value} of ${this.suit}`
    }
}


module.exports = {Deck, Card}
