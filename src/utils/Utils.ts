import { Message } from 'discord.js'

const Fuse = require(`fuse.js`)

export function getPrompt(channel, filter): any {
    const collector = channel.createMessageCollector(filter, { max: 1 })

    return {
        message: new Promise((resolve, reject) => {
            collector.on('end', collected => {
                if (collected.size === 0) {
                    reject(new Error(`Collector stopped`))
                    return
                }

                resolve(collected.first() as Message)
            })
        }),
        collector,
    }
}

export async function getBinaryReactions(message, maxTime, options) {
    const collector = message.createReactionCollector(
        (reaction, _) => {
            return options.includes(reaction.emoji.name)
        },
        { time: maxTime },
    )

    const promise = new Promise(resolve => {
        collector.on('end', collected => {
            resolve(collected)
        })
    })

    for (const option of options) {
        await message.react(option)
    }

    collector.on('collect', async (reaction, user) => {
        if (options.includes(reaction.emoji.name)) {
            for (const r of message.reactions.cache.values()) {
                const react = r.emoji.name
                if (
                    react !== reaction.emoji.name &&
                    options.includes(react) &&
                    r.users.cache.has(user.id)
                ) {
                    await r.users.remove(user)
                }
            }
        }
    })

    return promise
}

export function createFuse(responseOptions, numeric) {
    if (numeric) {
        const [s1, s2] = responseOptions[0].split('-')
        const [start, end] = [parseInt(s1), parseInt(s2)]
        responseOptions = [...new Array(end).keys()]
            .map(val => String(val + start))
            .join('|')
        return new RegExp(`^(${responseOptions})$`)
    }
    return new Fuse(responseOptions)
}

export function filter(user, checker) {
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
