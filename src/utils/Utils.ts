import {
    Collection,
    DiscordAPIError,
    Message,
    MessageReaction,
    ReactionCollector,
} from 'discord.js'

import { CollectorPlayerLeftError } from '../game/Errors'
import { DiscordErrors } from './Consts'

const Fuse = require(`fuse.js`)

export function sum(n) {
    return (Math.pow(n, 2) + n) / 2
}

export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

export function inElementOf(list, query) {
    for (const option of list) {
        if (option.includes(query)) {
            return option
        }
    }
    return null
}

export function createRows(elements, rowIndices): Array<Array<any>> {
    const rows = []
    let currentRow = []

    for (let i = 0; i < elements.length; i++) {
        if (rowIndices.includes(i) && i !== 0) {
            rows.push(currentRow)
            currentRow = []
        }
        currentRow.push(elements[i])
    }
    rows.push(currentRow)

    return rows
}

export function createChecker(responseOptions, numeric) {
    if (numeric) {
        const [s1, s2] = responseOptions[0].split(',') // splitting on , ensures negative numbers are supported
        const [start, end] = [parseInt(s1), parseInt(s2)]
        responseOptions = [...new Array(end - start + 1).keys()]
            .map(val => String(val + start))
            .join('|')
        return new RegExp(`^(${responseOptions})$`)
    }
    return new Fuse(responseOptions)
}

export function getFilter(user, checker) {
    return m => {
        let correctAnswer
        if (checker instanceof Fuse) {
            correctAnswer = checker.search(m.content).length === 1
        } else {
            correctAnswer = checker.test(m.content)
        }
        return correctAnswer && m.author.equals(user)
    }
}

export function getPrompt(channel, filter): any {
    const collector = channel.createMessageCollector({ filter, max: 1 })

    return {
        collected: new Promise((resolve, reject) => {
            collector.on('end', collected => {
                if (collected.size === 0) {
                    reject(new CollectorPlayerLeftError(`Collector stopped`))
                    return
                }

                resolve(collected.first() as Message)
            })
        }),
        collector,
    }
}

export function getSingleReaction(player, message, options) {
    const collector = message.createReactionCollector({
        filter: (reaction, user) => {
            const emojiName = reaction.emoji.toString()
            return user.equals(player) && inElementOf(options, emojiName)
        },
        max: 1,
    })

    return {
        collected: new Promise((resolve, reject) => {
            collector.on('end', collected => {
                if (collected.size === 0) {
                    reject(new CollectorPlayerLeftError(`Collector stopped`))
                    return
                }

                resolve(collected.first() as MessageReaction)
            })
        }) as Promise<MessageReaction>,
        collector: collector as ReactionCollector,
    }
}

export function getReactionsCollector(player, message, options) {
    return message.createReactionCollector({
        filter: (reaction, user) => {
            const emojiName = reaction.emoji.toString()
            return inElementOf(options, emojiName) && user.equals(player)
        },
    })
}

export async function getBinaryReactions(message, maxTime, options) {
    const collector = message.createReactionCollector({
        filter: (reaction, _) => {
            const emojiName = reaction.emoji.toString()
            return inElementOf(options, emojiName)
        },
        time: maxTime,
    })

    const collected = new Promise(resolve => {
        collector.on('end', collect => {
            resolve(collect)
        })
    })

    collector.on('collect', async (reaction, user) => {
        const newReactionName = reaction.emoji.toString()
        const users = reaction.users.cache
        const messageReactions = message.reactions.cache.values()

        if (inElementOf(options, newReactionName)) {
            for (const react of messageReactions) {
                const oldReactionName = react.emoji.name
                if (
                    newReactionName !== oldReactionName &&
                    inElementOf(options, oldReactionName) &&
                    users.has(user.id) &&
                    !user.bot
                ) {
                    await react.users.remove(user)
                }
            }
        }
    })

    await reactOptions(message, options)

    return {
        collected: collected as Promise<Collection<string, MessageReaction>>,
        collector,
    }
}

// Fails the given function silently if the caught error is in the given errorCodes
export async function failSilently(func, errorCodes) {
    try {
        await func()
    } catch (err) {
        if (
            !(err instanceof DiscordAPIError && errorCodes.includes(err.code))
        ) {
            throw err
        }
    }
}

export async function removeMessage(message) {
    return failSilently(message.delete.bind(message), [
        DiscordErrors.UNKNOWN_MESSAGE,
    ])
}

export async function removeReaction(reaction: MessageReaction, user) {
    return failSilently(reaction.users.remove.bind(reaction.users, user), [
        DiscordErrors.UNKNOWN_MESSAGE,
    ])
}

export async function reactOptions(message, options) {
    for (const option of options) {
        await failSilently(message.react.bind(message, option), [
            DiscordErrors.UNKNOWN_MESSAGE,
        ])
    }
}
