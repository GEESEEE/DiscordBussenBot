import { ReactionCollector, TextChannel } from 'discord.js'

import { Card } from '../game/Deck'
import { Game } from '../game/Game'

declare module 'discord.js' {
    interface User {
        cards: Array<Card>
        addCard(card: Card): void
        equals(player: User): boolean
        getCardsWithValue(card: Card): Array<Card>
        hasCards(): boolean
        hasValueInHand(card: Card): boolean
        removeAllCards(): void
        removeCard(card: Card): void
    }

    interface Collector<K, V> {
        player: User
    }

    interface Guild {
        collector: ReactionCollector
        currentChannel: TextChannel
        currentGame: Game
        gameExists(): boolean

        getJoinEmbed(): MessageEmbed

        hasChannel(): boolean

        isfromChannel(message: Message): boolean

        readyToEnd(message): boolean

        readyToHelp(message): boolean

        readyToJoin(message): boolean

        readyToKick(message, user): boolean

        readyToQuit(message): boolean

        readyToPassInput(message, user): boolean

        readyToMakeLeader(message, user): boolean

        readyToShowGames(message): boolean

        readyToStart(message): boolean

        removeGameVote(message): Promise<void>

        removePlayer(player): Promise<void>

        startGame(): Promise<void>

        unsafeRemoveGameVote(message): Promise<void>

        validMessage(message: Message): boolean
    }
}
