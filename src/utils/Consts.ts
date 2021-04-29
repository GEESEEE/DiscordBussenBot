import { Emoji } from './Emoji'

export enum Suit {
    CLUBS = '<:clubs:834190252478300231>',
    DIAMONDS = '♦',
    HEARTS = '♥',
    SPADES = '<:spades:834190269482008614>',
}

export enum Value {
    ACE = 'Ace',
    EIGHT = '8',
    FIVE = '5',
    FOUR = '4',
    JACK = 'Jack',
    KING = 'King',
    NINE = '9',
    QUEEN = 'Queen',
    SEVEN = '7',
    SIX = '6',
    TEN = '10',
    THREE = '3',
    TWO = '2',
}

export const Strings = {
    RED: 'red',
    BLACK: 'black',
    HIGHER: 'higher',
    LOWER: 'lower',
    YES: 'yes',
    NO: 'no',
    NEXT: 'next',
}

export const StringCouples = {
    YES_NO: [Strings.YES, Strings.NO],
    RED_BLACK: [Strings.RED, Strings.BLACK],
    HIGHER_LOWER: [Strings.HIGHER, Strings.LOWER],
}

export const ReactionEmojis = {
    YES_NO: [Emoji.YES, Emoji.NO],
    RED_BLACK: [Emoji.HEARTS, Emoji.SPADES],
    HIGHER_LOWER: [Emoji.HIGHER, Emoji.LOWER],
    JOIN_START: [Emoji.JOIN, Emoji.PLAY],
    HIGHER_LOWER2: [
        Emoji.HIGHER,
        Emoji.HIGHER2,
        Emoji.LOWER,
        Emoji.LOWER2,
        Emoji.PLAY,
    ],
}

export const DiscordErrors = {
    UNKNOWN_MESSAGE: 10008,
}

export const EmptyString = `\u200B`
