import { Suit, Value } from '../utils/Consts'

export class Deck {
    cards: Array<Card>
    constructor(CardType: any) {
        this.cards = []

        for (const value of Object.values(Value)) {
            for (const suit of Object.values(Suit)) {
                const card = new CardType(value, suit)
                this.addCard(card)
            }
        }
    }

    addCard(card: Card) {
        this.cards.push(card)
    }

    addCards(cards: Card[]) {
        this.cards.push(...cards)
    }

    removeCard(card: Card) {
        const index = this.cards.indexOf(card)
        if (index > -1) {
            this.cards.splice(index, 1)
        }
    }

    isEmpty() {
        return this.cards.length === 0
    }

    getRandomCard() {
        if (!this.isEmpty()) {
            const index = Math.floor(Math.random() * this.cards.length)
            const card = this.cards[index]
            this.removeCard(card)
            return card
        } else {
            return null
        }
    }
}

export abstract class Card {
    value: Value
    suit: Suit

    // Any implementation *must* have their own CardValueMap
    CardValueMap!: Record<Value, number>

    protected constructor(value: Value, suit: Suit) {
        this.value = value
        this.suit = suit
    }

    valueOf() {
        return this.CardValueMap[this.value]
    }

    equals(card: Card) {
        return this.valueOf() === card.valueOf()
    }

    isBetween(card1: Card, card2: Card) {
        return (card1 < this && this < card2) || (card2 < this && this < card1)
    }

    isRed() {
        return this.suit === Suit.DIAMONDS || this.suit === Suit.HEARTS
    }

    isBlack() {
        return this.suit === Suit.CLUBS || this.suit === Suit.SPADES
    }

    hasSameSuit(cards: Card[]) {
        for (const card of cards) {
            if (card.suit === this.suit) {
                return true
            }
        }
        return false
    }

    isEqualTo(cards: Card[]) {
        for (const card of cards) {
            if (this.equals(card)) {
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

    suitToString() {
        if (this.suit === Suit.SPADES) {
            return `Spades`
        } else if (this.suit === Suit.CLUBS) {
            return `Clubs`
        } else if (this.suit === Suit.HEARTS) {
            return `Hearts`
        } else {
            return `Diamonds`
        }
    }

    valueToString() {
        if (this.value === `10`) {
            return this.value
        } else {
            return this.value.charAt(0)
        }
    }

    toString() {
        return `${this.prefix} **${this.value}** of ${this.suit}`
    }
}
