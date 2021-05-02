import {
    Canvas,
    CanvasRenderingContext2D,
    createCanvas,
    loadImage,
} from 'canvas'

import { Card } from '../game/Deck'

export class CardPrinter {
    cards: Array<Card>
    canvas: Canvas
    ctx: CanvasRenderingContext2D
    rows: Array<number>
    center: boolean

    readonly cardWidth = 80
    readonly cardHeight = 120

    readonly betweenCards = 5

    constructor(cards, rows: Array<number> = [0], center = false) {
        this.cards = cards
        this.rows = rows
        this.center = center

        const maxRowSize = this.maxRows()
        const width =
            maxRowSize * (this.cardWidth + this.betweenCards) -
            this.betweenCards

        const height =
            rows.length * (this.cardHeight + this.betweenCards) -
            this.betweenCards

        this.canvas = createCanvas(width, height)
        this.ctx = this.canvas.getContext(`2d`)
    }

    createRows(cards): Array<Array<Card>> {
        return null
    }

    maxRows() {
        let maxRowSize = 0

        if (this.rows.length > 1) {
            let lastRow = 0
            for (let i = 0; i < this.rows.length; i++) {
                const currentRow = this.rows[i]
                if (
                    i === this.rows.length - 1 &&
                    this.cards.length - currentRow + 1 > maxRowSize
                ) {
                    maxRowSize = this.cards.length - currentRow + 1
                } else if (lastRow && currentRow - lastRow > maxRowSize) {
                    maxRowSize = currentRow - lastRow
                }

                lastRow = currentRow
            }
        } else {
            maxRowSize = this.cards.length
        }
        return maxRowSize
    }

    async printCards() {
        let x = 0
        let y = 0

        const rowSize = 0

        for (let i = 0; i < this.cards.length; i++) {
            if (i != 0 && this.rows.includes(i)) {
                y += this.cardHeight + this.betweenCards
                x = 0
            }
            const card = this.cards[i]
            const image = await this.getImage(card)

            this.ctx.drawImage(image, x, y, this.cardWidth, this.cardHeight)
            x += this.cardWidth + this.betweenCards
        }
    }

    async getImage(card) {
        const imgName = card.valueToString() + card.suitToString().charAt(0)
        const imgPath = `./assets/Cards/${imgName}.png`
        return loadImage(imgPath)
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
