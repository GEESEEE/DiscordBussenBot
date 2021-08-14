import { Collection } from 'discord.js'

import { createRows } from '../../../utils/Utils'
import { Card } from '../../Card'
import { Deck } from '../../Deck'
import { Player } from '../../Player'
import { BussenCard } from './Card'

export class Bus {
    player: Player
    deck: Deck
    size: number
    sequence: Array<Card>
    currentIndex: number

    discarded: Array<Card>

    checkpoints: Array<number>
    currentCheckpoint: number
    isFinished: boolean

    turns: number
    drinkMap: Collection<Player, number>

    hidden: boolean
    maxIndex: number

    constructor(
        player: Player,
        size: number,
        checkpoints: number,
        hidden: boolean,
    ) {
        this.player = player
        this.deck = new Deck(BussenCard)
        this.sequence = []
        this.size = size
        this.hidden = hidden

        for (let i = 0; i < size; i++) {
            this.sequence.push(this.deck.getRandomCard()!)
        }
        this.discarded = []
        this.currentIndex = 0
        this.checkpoints = [0]
        this.maxIndex = -1

        for (let i = 0; i < checkpoints; i++) {
            this.checkpoints.push(
                Math.floor((size / (checkpoints + 1)) * (i + 1)),
            )
        }

        this.currentCheckpoint = 0
        this.isFinished = false

        this.turns = 1
        this.drinkMap = new Collection()
    }

    get drinkCount() {
        return this.currentIndex + 1 - this.getCurrentCheckpoint()
    }

    incrementIndex(correct: boolean) {
        if (this.currentIndex > this.maxIndex) {
            this.maxIndex = this.currentIndex
        }

        if (correct) {
            this.currentIndex = (this.currentIndex + 1) % this.sequence.length
            if (
                this.checkpoints.includes(this.currentIndex - 1) &&
                this.getCurrentCheckpoint() < this.currentIndex - 1
            ) {
                this.currentCheckpoint += 1
            }

            if (this.currentIndex === 0) {
                this.isFinished = true
            }
        } else {
            this.currentIndex = this.getCurrentCheckpoint()
        }
    }

    getCurrentCheckpoint() {
        return this.checkpoints[this.currentCheckpoint]
    }

    getCurrentCard() {
        return this.sequence[this.currentIndex]
    }

    getRandomCard() {
        if (this.deck.isEmpty()) {
            this.deck.addCards(this.discarded)
            this.discarded = []
        }
        return this.deck.getRandomCard()
    }

    iterate(newCard: Card, correct: boolean) {
        this.discarded.push(this.getCurrentCard())
        this.sequence[this.currentIndex] = newCard

        if (!correct) {
            let playerDrinks = 0
            if (typeof this.drinkMap.get(this.player) === 'undefined') {
                this.drinkMap.set(this.player, 0)
            } else {
                playerDrinks = this.drinkMap.get(this.player)!
            }
            this.drinkMap.set(this.player, playerDrinks + this.drinkCount)
        }
        this.incrementIndex(correct)
        this.turns++
    }

    printDrinkMap(): string {
        let string = ''
        for (const entry of this.drinkMap.entries()) {
            string += `${entry[0]} consumed ${entry[1]} drinks\n`
        }
        return string
    }

    cardPrinterParams(focus = false, showDrawn?: boolean) {
        const rows = createRows(this.sequence, this.checkpoints)
        const centered = [true]
        let focused: Array<Array<number>> | undefined
        let focusIndex
        let hidden
        let hiddenIndex: number | undefined

        if (focus) {
            focused = []
            focusIndex = this.currentIndex
        }

        if (this.hidden) {
            hidden = []
            hiddenIndex =
                showDrawn && this.currentIndex > this.maxIndex
                    ? this.maxIndex + 1
                    : this.maxIndex
        }

        if (
            typeof focusIndex !== 'undefined' ||
            typeof hiddenIndex !== 'undefined'
        ) {
            let curr = 0
            for (const row of rows) {
                const rowFocused = []
                const rowHidden = []

                for (let i = 0; i < row.length; i++) {
                    if (curr === focusIndex) {
                        rowFocused.push(i)
                    }

                    if (curr > hiddenIndex!) {
                        rowHidden.push(true)
                    } else {
                        rowHidden.push(false)
                    }

                    curr += 1
                }

                if (focus) {
                    focused!.push(rowFocused)
                }
                if (hidden) {
                    hidden.push(rowHidden)
                }
            }
        }

        return { rows, centered, focused, hidden }
    }
}
