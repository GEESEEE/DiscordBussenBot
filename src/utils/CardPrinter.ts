import { Card } from '../game/Deck'

export class CardPrinter {
    cards: Array<Card>

    constructor(cards) {
        this.cards = cards
    }

    static print(cards) {
        if (cards.length > 0) {
            const betweenCards = `  `
            let string = '```\n'

            for (const card of cards) {
                string += `╭────╮`
                string += betweenCards
            }
            string += `\n`

            for (const card of cards) {
                string += `│${card.stringSuit}  ${card.value.charAt(0)}│`
                string += betweenCards
            }
            string += `\n`

            for (const card of cards) {
                string += `│    │`
                string += betweenCards
            }
            string += `\n`

            for (const card of cards) {
                string += `│${card.value.charAt(0)}  ${card.stringSuit}│`
                string += betweenCards
            }
            string += `\n`

            for (const card of cards) {
                string += `╰────╯`
                string += betweenCards
            }
            string += `\n`

            string += '```\n'
            return string
        } else {
            return `None\n`
        }
    }
}
