import { Canvas, CanvasRenderingContext2D, loadImage } from 'canvas'

import { Card } from '../game/Card'

export class CardPrinter {
    readonly cardWidth = 80
    readonly cardHeight = 120
    readonly betweenCards = 4
    readonly font = '14px "Uni Sans Heavy"'

    canvas: Canvas
    ctx: CanvasRenderingContext2D
    rows: Array<Array<Card> | string | number> // keeps track of rows, number is empty space
    centered: Array<boolean>
    focused: Array<Array<number> | undefined>
    hidden: Array<Array<boolean> | undefined>

    yOffset: number

    constructor() {
        this.canvas = new Canvas(1, 1)
        this.ctx = this.canvas.getContext('2d')
        this.setFont()

        this.rows = []
        this.centered = []
        this.focused = []
        this.hidden = []

        this.yOffset = 0
    }

    private get fontSize() {
        return parseInt(this.font.split(`px`)[0])
    }

    private static async backImage() {
        return loadImage(`./assets/Cards/card_back.png`)
    }

    private static async getImage(card: Card) {
        const imgName = card.valueToString() + card.suitToString().charAt(0)
        const imgPath = `./assets/Cards/${imgName}.png`
        return loadImage(imgPath)
    }

    private setFont() {
        this.ctx.font = this.font
        this.ctx.fillStyle = '#ffffff'
    }

    private getRowWidth(row: Array<Card> | string | number): number {
        let width
        if (row instanceof Array) {
            const size = row.length
            width = size * this.cardWidth + (size - 1) * this.betweenCards
        } else if (typeof row === 'string') {
            width = this.ctx.measureText(row).width
        } else {
            width = 0
        }
        return width
    }

    private getRowHeight(row: Array<Card> | string | number): number {
        let height
        if (row instanceof Array) {
            height = this.cardHeight + this.betweenCards
        } else if (typeof row === 'string') {
            height = this.fontSize + this.betweenCards
        } else {
            height = row
        }
        return height
    }

    addRow(
        toPrint: Array<Card> | string | number,
        centered = false,
        focused?: Array<number> | undefined,
        hidden?: Array<boolean> | undefined,
    ) {
        this.rows.push(toPrint)
        this.centered.push(centered)
        this.focused.push(focused)
        this.hidden.push(hidden)
        return this
    }

    addRows(
        toPrint: Array<Array<Card> | string | number>,
        centered?: Array<boolean>,
        focused?: Array<Array<number>>,
        hidden?: Array<Array<boolean>>,
    ) {
        if (!centered) {
            centered = new Array(toPrint.length).fill(true)
        }

        if (centered.length === 1) {
            centered = new Array(toPrint.length).fill(centered[0])
        }

        for (let i = 0; i < toPrint.length; i++) {
            this.addRow(
                toPrint[i],
                centered[i],
                focused ? focused[i] : undefined,
                hidden ? hidden[i] : undefined,
            )
        }
        return this
    }

    async print() {
        const maxRowWidth = Math.max(
            ...this.rows.map(row => this.getRowWidth(row)),
        )
        const totalRowHeight = this.rows.reduce(
            (sum: number, row: Array<Card> | string | number) =>
                sum + this.getRowHeight(row),
            0,
        )

        this.canvas.width = maxRowWidth === 0 ? 1 : maxRowWidth
        this.canvas.height = totalRowHeight === 0 ? 1 : totalRowHeight
        this.setFont()

        for (let i = 0; i < this.rows.length; i++) {
            await this.printRow(i)
        }
        return this
    }

    private async printRow(index: number) {
        const row = this.rows[index]
        const centered = this.centered[index]
        const focused = this.focused[index]
        const hidden = this.hidden[index]

        let x = 0
        if (centered) {
            x = this.canvas.width / 2 - this.getRowWidth(row) / 2
        }
        const y = this.yOffset

        if (row instanceof Array) {
            for (let i = 0; i < row.length; i++) {
                const card = row[i]
                const cardHidden = hidden ? hidden[i] : false
                const cardFocused = focused ? focused.includes(i) : false

                let image
                if (cardHidden) {
                    image = await CardPrinter.backImage()
                } else {
                    image = await CardPrinter.getImage(card)
                }

                this.ctx.globalAlpha = focused && !cardFocused ? 0.5 : 1.0

                this.ctx.drawImage(image, x, y, this.cardWidth, this.cardHeight)
                x += this.cardWidth + this.betweenCards
            }
        } else if (typeof row === `string`) {
            this.ctx.fillText(row, x, y + this.fontSize)
        }

        this.yOffset += this.getRowHeight(row)
    }
}
