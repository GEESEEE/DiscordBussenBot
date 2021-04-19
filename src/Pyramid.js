const {Deck, Card} = require('./Deck')

class Pyramid {

    constructor(deck, reversed, size) {
        this.reverse = reversed
        this.size = size
        this.cards = []
        if (reversed) {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j <= i; j++) {
                    this.cards.push(deck.getRandomCard())
                }
            }
        } else {
            for (let i = size; i >= 0; i--) {
                for (let j = 0; j < i; j++) {
                    this.cards.push(deck.getRandomCard())
                }
            }
        }
    }
}