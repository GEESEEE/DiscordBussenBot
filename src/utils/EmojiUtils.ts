export enum Emoji {
    CLUBS = '<:clubs:834190252478300231>',
    DIAMONDS = '♦',
    HEARTS = '♥',
    SPADES = '<:spades:834190269482008614>',
    YES = '🇾',
    NO = '🇳',
    HIGHER = `⬆`,
    HIGHER2 = `⏫`,
    LOWER = '⬇',
    LOWER2 = `⏬`,
    JOIN = '🎮',
    PLAY = `▶`,
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

export const EmojiStrings = {
    [Emoji.YES]: 'yes',
    [Emoji.NO]: 'no',
    [Emoji.HEARTS]: 'red',
    [Emoji.SPADES]: 'black',
    [Emoji.HIGHER]: 'higher',
    [Emoji.LOWER]: 'lower',
}
