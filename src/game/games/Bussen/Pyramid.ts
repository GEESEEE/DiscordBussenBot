import { sum } from '../../../utils/Utils'
import { Card, Deck } from '../../Deck'

export class Pyramid {
    deck: Deck
    reversed: boolean
    size: number
    cards: Array<Card>
    index: number
    rows: Array<number>

    constructor(deck: Deck, reversed: boolean, size: number) {
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
                    this.cards.push(deck.getRandomCard()!)
                    index++
                }
            }
        } else {
            for (let i = size; i > 0; i--) {
                this.rows.push(index)
                for (let j = 0; j < i; j++) {
                    this.cards.push(deck.getRandomCard()!)
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

    getDrinkCounts(index: number) {
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
