import {
    DiscordAPIError,
    Message,
    MessageCollector,
    MessageReaction,
    ReactionCollector,
    ReactionEmoji,
    ReactionManager,
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
    const collector = channel.createMessageCollector(filter, { max: 1 })

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
    const collector = message.createReactionCollector(
        (reaction, user) => {
            const emojiName = reaction.emoji.name
            return inElementOf(options, emojiName) && user.equals(player)
        },
        { max: 1 },
    )

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
    return message.createReactionCollector((reaction, user) => {
        const emojiName = reaction.emoji.name
        return inElementOf(options, emojiName) && user.equals(player)
    }, {})
}

export function getBinaryReactions(message, maxTime, options) {
    const collector = message.createReactionCollector(
        (reaction, _) => {
            const emojiName = reaction.emoji.name
            return inElementOf(options, emojiName)
        },
        { time: maxTime },
    )

    const collected = new Promise(resolve => {
        collector.on('end', collect => {
            resolve(collect)
        })
    })

    collector.on('collect', async (reaction, user) => {
        const newReactionName = reaction.emoji.name
        const users = reaction.users.cache
        const messageReactions = message.reactions.cache.values()

        if (inElementOf(options, newReactionName)) {
            for (const react of messageReactions) {
                const oldReactionName = react.emoji.name
                if (
                    newReactionName !== oldReactionName &&
                    inElementOf(options, oldReactionName) &&
                    users.has(user.id)
                ) {
                    await react.users.remove(user)
                }
            }
        }
    })

    return { collected, collector }
}

// Fails the given function silently if the caught error is in the given errorCodes
export async function failSilently(func, errorCodes) {
    try {
        await func()
    } catch (err) {
        console.log(err)
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
        await message.react(option)
    }
}
