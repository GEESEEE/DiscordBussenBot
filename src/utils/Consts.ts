const pluralize = require(`pluralize`)

export enum Suit {
    CLUBS = '<:clubs:834190252478300231>',
    DIAMONDS = ':diamonds:',
    HEARTS = ':heart:',
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

export const ReactionStrings = {
    YES_NO: [`😩`, `😂`],
}

export const StringState = {
    EQUAL: (player, card, drinks) =>
        `${player} drew ${card} and everyone has to consume ${pluralize(
            'drink',
            drinks,
            true,
        )}`,
    TRUE: (player, card) => `${player} drew ${card} and was correct`,
    FALSE: (player, card, drinks) =>
        `${player} drew ${card} and has to consume ${pluralize(
            'drink',
            drinks,
            true,
        )}`,
}
