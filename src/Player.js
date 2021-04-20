const {Structures} = require('discord.js')

const Player = Structures.extend("User", User => {

    class Player extends User {

        constructor(...args) {
            super(...args)
            this.cards = []
        }

        equals(player) {
            return this.id === player.id
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

        removeAllCards() {
            this.cards = []
        }

        hasCards() {
            return this.cards.length !== 0
        }

        hasValueInHand(card) {
            for (const handCard of this.cards) {
                if (handCard.equals(card)) {
                    return true
                }
            }
            return false
        }

        getCardsWithValue(card) {
            let cards = this.cards.filter(handCard => handCard.equals(card))
            for (const c of cards) {this.removeCard(c)}
            return cards
        }

        suitsCount() { //TODO: fix
            let suits = [...new Set(this.cards.map(card => card.suit))]
            return suits.length
        }

    }

    return Player

})

module.exports = Player