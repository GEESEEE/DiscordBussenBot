import {Suit, Value} from "./utils/Consts";

export class Deck {

    deck: Array<Card>
    constructor() {
        this.deck = []

        for (const value of Object.values(Value)) {
            for (const suit of Object.values(Suit)) {
                const card = new Card(value, suit)
                this.deck.push(card)
            }
        }

    }

    addCard(card) {
        this.deck.push(...card)
    }

    addCards(cards) {
        this.deck.push(...cards)
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

export class Card {

    value: Value
    suit: Suit

    constructor(value, suit) {
        this.value = value
        this.suit = suit
    }

    valueOf() {
        return Object.entries(Value).findIndex(value => value[1] === this.value)
    }

    equals(card) {
        return this.valueOf() === card.valueOf()
    }

    isBetween(card1, card2) {
        return ((card1 < this && this < card2) || (card2 < this && this < card1))
    }

    isRed() {
        return this.suit === Suit.DIAMONDS || this.suit === Suit.HEARTS
    }

    isBlack() {
        return this.suit === Suit.CLUBS || this.suit === Suit.SPADES
    }

    hasSameSuit(cards) {
        for (const card of cards) {
            if (card.suit === this.suit) {
                return true
            }
        }
        return false
    }

    get prefix() {
        let string = `a`
        if ([Value.EIGHT, Value.ACE].includes(this.value)) {
            string += `n`
        }
        return string
    }

    toString() {
        return `${this.prefix} **${this.value}** of ${this.suit}`
    }
}

