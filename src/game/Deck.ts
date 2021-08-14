import { Suit, Value } from '../utils/Consts'
import { Card } from './Card'

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
