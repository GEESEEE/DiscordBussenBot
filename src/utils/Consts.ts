const pluralize = require(`pluralize`)

export enum Suit {
    DIAMONDS = ":diamonds:",
    SPADES = "<:spades:834190269482008614>",
    CLUBS = "<:clubs:834190252478300231>",
    HEARTS = ":heart:"
}

export enum Value {
    TWO = "2",
    THREE = "3",
    FOUR = "4",
    FIVE = "5",
    SIX = "6",
    SEVEN = "7",
    EIGHT = "8",
    NINE = "9",
    TEN = "10",
    JACK = "Jack",
    QUEEN = "Queen",
    KING = "King",
    ACE = "Ace"
}

export const Strings = {
    RED: "red",
    BLACK: "black",
    HIGHER: "higher",
    LOWER: "lower",
    YES: "yes",
    NO: "no",
    NEXT: "next"
}

export const StringCouples = {
    YES_NO: [Strings.YES, Strings.NO],
    RED_BLACK: [Strings.RED , Strings.BLACK],
    HIGHER_LOWER: [Strings.HIGHER, Strings.LOWER]
}

export const StringState = {
    EQUAL : (player, card, drinks) => `${player} drew ${card} and everyone has to consume ${pluralize("drink", drinks, true)}`,
    TRUE :(player, card) =>  `${player} drew ${card} and was correct`,
    FALSE :(player, card, drinks) => `${player} drew ${card} and has to consume ${pluralize("drink", drinks, true)}`
}
