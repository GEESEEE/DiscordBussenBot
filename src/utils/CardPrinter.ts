import {
    Canvas,
    CanvasRenderingContext2D,
    createCanvas,
    loadImage,
} from 'canvas'
import { registerFont } from 'canvas'
registerFont('./assets/Uni_Sans_Heavy.otf', { family: 'Uni Sans Heavy' })

import { Card } from '../game/Deck'

export class CardPrinter {
    cards: Array<Array<Card>>
    canvas: Canvas
    ctx: CanvasRenderingContext2D

    center: boolean
    text: string
    yOffset: number
    firstCardIndex: number
    focusedCard: number

    readonly cardWidth = 80
    readonly cardHeight = 120

    readonly betweenCards = 4

    constructor(
        cards: Array<Card>,
        rows: Array<number> = [0],
        center = false,
        text = ``,
        cardCount = -1,
        focusedCard = -1,
    ) {
        this.cards = this.createRows(cards, rows)
        this.center = center
        this.text = text

        const maxRowSize = Math.max(...this.cards.map(row => row.length))
        const width =
            maxRowSize * (this.cardWidth + this.betweenCards) -
            this.betweenCards

        let height =
            this.cards.length * (this.cardHeight + this.betweenCards) -
            this.betweenCards

        if (this.text && this.text.length > 0) {
            height += 20
        }

        this.canvas = createCanvas(
            width === 0 ? 1 : width,
            height === 0 ? 1 : height,
        )
        this.ctx = this.canvas.getContext(`2d`)

        if (this.text && this.text.length > 0) {
            this.ctx.font = '14px "Uni Sans Heavy"'
            this.ctx.fillStyle = '#ffffff'
            this.ctx.fillText(this.text, 0, 14)
            this.yOffset = 20
        } else {
            this.yOffset = 0
        }

        if (cardCount >= 0) {
            this.firstCardIndex = cards.length - cardCount
        } else {
            this.firstCardIndex = 0
        }

        if (focusedCard >= 0) {
            this.focusedCard = cards.length - focusedCard
        } else {
            this.focusedCard = -1
        }
    }

    get backImage() {
        return loadImage(`./assets/Cards/card_back.png`)
    }

    async getImage(card) {
        const imgName = card.valueToString() + card.suitToString().charAt(0)
        const imgPath = `./assets/Cards/${imgName}.png`
        return loadImage(imgPath)
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
        let current = 0

        for (let i = 0; i < this.cards.length; i++) {
            const row = this.cards[i]
            y = i * (this.cardHeight + this.betweenCards) + this.yOffset

            if (this.center) {
                x =
                    this.canvas.width / 2 -
                    (row.length * (this.cardWidth + this.betweenCards)) / 2 -
                    this.betweenCards / 2
            } else {
                x = 0
            }

            for (let j = 0; j < row.length; j++) {
                let image
                if (current >= this.firstCardIndex) {
                    const card = row[j]
                    image = await this.getImage(card)

                    if (
                        current === this.focusedCard ||
                        this.focusedCard === -1
                    ) {
                        this.ctx.globalAlpha = 1
                    } else {
                        this.ctx.globalAlpha = 0.5
                    }
                } else {
                    image = await this.backImage
                    this.ctx.globalAlpha = 1
                }

                this.ctx.drawImage(image, x, y, this.cardWidth, this.cardHeight)
                x += this.cardWidth + this.betweenCards
                current += 1
            }
        }
    }
}
