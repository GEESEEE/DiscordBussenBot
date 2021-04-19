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

    async start(channel) {
        this.hasStarted = true
        this.channel = channel
        await this.askColours()
        await this.askHigherOrLower()
        await this.askInBetween()
        await this.askSuits()
    }

    async askColours() {
        for (const player of this.players) {
            this.channel.send(`${player} red or black? (red/black)`)
            const filter = m => /^(red|black)$/i.test(m.content) && m.author.id === player.id

            const message = (await this.channel.awaitMessages(filter, {max: 1})).first()
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

    async askHigherOrLower() {
        for (const player of this.players) {
            const playerCard = player.cards[0]
            this.channel.send(`${player} higher or lower than a ${playerCard}? (higher/lower)`)
            const filter = m => /^(higher|lower)$/i.test(m.content) && m.author.id === player.id

            const message = (await this.channel.awaitMessages(filter, {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()
            player.addCard(card)

            if ((content === "higher" && card > playerCard) || (content === "lower" && card < playerCard) ) {
                this.channel.send(`${player} drew a ${card} and was correct`)
            } else if (card.equals(playerCard)) {
                this.channel.send(`${player} drew a ${card} and everyone has to consume 1 drink`)
            } else {
                this.channel.send(`${player} drew a ${card} and has to consume 1 drink`)
            }

        }
    }

    async askInBetween() {
        for (const player of this.players) {
            const playerCard1 = player.cards[0]
            const playerCard2 = player.cards[1]
            this.channel.send(`${player} is it between a ${playerCard1} and a ${playerCard2}? (yes/no)`)
            const filter = m => /^(yes|no)$/i.test(m.content) && m.author.id === player.id

            const message = (await this.channel.awaitMessages(filter, {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()
            player.addCard(card)

            if (card.equals(playerCard1) || card.equals(playerCard2)){
                this.channel.send(`${player} drew a ${card} and everyone to consume 1 drink`)
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
            const filter = m => /^(yes|no)$/i.test(m.content) && m.author.id === player.id

            const message = (await this.channel.awaitMessages(filter, {max: 1})).first()
            const content = message.content.toLowerCase()
            const card = this.deck.getRandomCard()
            player.addCard(card)

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

        }
    }

}

module.exports = Bussen