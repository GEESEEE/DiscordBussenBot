import { Card } from '../game/Deck'

export class CardPrinter {
    cards: Array<Card>

    constructor(cards) {
        this.cards = cards
    }

    static print(cards) {
        if (cards.length > 0) {
            const betweenCards = ` `
            let string = '```\n'

            for (let i = 0; i < cards.length; i++) {
                string += `╭────╮`
                if (i !== cards.length - 1) {
                    string += betweenCards
                }
            }
            string += `\n`

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i]
                if (card.value === `10`) {
                    string += `│${card.stringSuit} ${card.value}│`
                } else {
                    string += `│${card.stringSuit}  ${card.value.charAt(0)}│`
                }

                if (i !== cards.length - 1) {
                    string += betweenCards
                }
            }
            string += `\n`

            for (let i = 0; i < cards.length; i++) {
                string += `│    │`
                if (i !== cards.length - 1) {
                    string += betweenCards
                }
            }
            string += `\n`

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i]
                if (card.value === `10`) {
                    string += `│${card.value} ${card.stringSuit}│`
                } else {
                    string += `│${card.value.charAt(0)}  ${card.stringSuit}│`
                }

                if (i !== cards.length - 1) {
                    string += betweenCards
                }
            }
            string += `\n`

            for (let i = 0; i < cards.length; i++) {
                string += `╰────╯`
                if (i !== cards.length - 1) {
                    string += betweenCards
                }
            }
            string += `\n`

            string += '```\n'
            return string
        } else {
            return `None\n`
        }
    }
}
