import {
    Canvas,
    CanvasRenderingContext2D,
    createCanvas,
    loadImage,
} from 'canvas'

import { Card } from '../game/Deck'

export class CardPrinter {
    cards: Array<Array<Card>>
    canvas: Canvas
    ctx: CanvasRenderingContext2D
    center: boolean

    readonly cardWidth = 80
    readonly cardHeight = 120

    readonly betweenCards = 4

    constructor(cards, rows: Array<number> = [0], center = false) {
        this.cards = this.createRows(cards, rows)
        this.center = center

        const maxRowSize = Math.max(...this.cards.map(row => row.length))

        const width = maxRowSize * (this.cardWidth + this.betweenCards)

        const height =
            this.cards.length * (this.cardHeight + this.betweenCards) -
            this.betweenCards

        this.canvas = createCanvas(width, height)
        this.ctx = this.canvas.getContext(`2d`)
    }

    createRows(cards, rowIndices): Array<Array<Card>> {
        const rows = []
        let currentRow = []

        for (let i = 0; i < cards.length; i++) {
            if (rowIndices.includes(i) && i !== 0) {
                rows.push(currentRow)
                currentRow = []
            }
            currentRow.push(cards[i])
        }
        rows.push(currentRow)

        return rows
    }

    async printCards() {
        let x = 0
        let y = 0

        for (let i = 0; i < this.cards.length; i++) {
            const row = this.cards[i]
            y = i * (this.cardHeight + this.betweenCards)
            if (this.center) {
                x =
                    this.canvas.width / 2 -
                    (row.length * (this.cardWidth + this.betweenCards)) / 2 -
                    this.betweenCards / 2
            } else {
                x = 0
            }

            for (let j = 0; j < row.length; j++) {
                const card = row[j]
                const image = await this.getImage(card)
                this.ctx.drawImage(image, x, y, this.cardWidth, this.cardHeight)
                x += this.cardWidth + this.betweenCards
            }
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
