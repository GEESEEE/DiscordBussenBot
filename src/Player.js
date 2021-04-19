const {Structures} = require('discord.js')
const {Deck, Card} = require('./Deck')

const Player = Structures.extend("User", User => {

    class Player extends User {

        constructor(...args) {
            super(...args)
            this.cards = []
        }

        addCard(card) {
            this.cards.push(card)
        }

        removeCard(card){
            const index = this.cards.indexOf(card)
            if (index > -1) {
                this.cards.splice(index, 1)
            }
        }

        hasCards() {
            return this.cards.length !== 0
        }

        suitsCount() {
            let suits = [...new Set(this.cards.map(card => card.suit))]
            return suits.length
        }

    }

    return Player

})

module.exports = Player