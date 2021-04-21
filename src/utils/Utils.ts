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
