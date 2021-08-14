import { User } from 'discord.js'

import { Card } from './Card'

export class Player {
    user: User
    cards: Array<Card>

    constructor(user: User) {
        this.user = user
        this.cards = []
    }

    equals(player: Player): boolean {
        return this.user.id === player.user.id ?? false
    }

    addCard(card: Card) {
        this.cards.push(card)
    }

    removeCard(card: Card) {
        const index = this.cards.indexOf(card)
        if (index > -1) {
            this.cards.splice(index, 1)
        }
    }

    removeAllCards() {
        this.cards = []
    }

    hasCards() {
        return this.cards.length > 0
    }

    hasValueInHand(card: Card) {
        for (const handCard of this.cards) {
            if (handCard.equals(card)) {
                return true
            }
        }
        return false
    }

    getCardsWithValue(card: Card) {
        const cards = this.cards.filter(handCard => handCard.equals(card))
        for (const c of cards) {
            this.removeCard(c)
        }
        return cards
    }

    suitsCount() {
        const suits = [...new Set(this.cards.map(card => card.suit))]
        return suits.length
    }

    toString() {
        return this.user.toString()
    }
}
