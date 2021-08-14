import {
    ButtonInteraction,
    DiscordAPIError,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageButton,
    MessageButtonStyleResolvable,
} from 'discord.js'
import fs from 'fs'

import {
    CollectorPlayerLeftError,
    GameEndedError,
    NewLeaderError,
} from '../game/Errors'
import { Player } from '../structures/Player'
import { DiscordErrors } from './Consts'

export function sum(n: number) {
    return (Math.pow(n, 2) + n) / 2
}

export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

export function readFolder(path: string, fileExtension = '.ts') {
    return fs.readdirSync(path).filter(file => file.endsWith(fileExtension))
}

export function incSize(
    min: number,
    max: number,
    current: number,
    toAdd: number,
) {
    const newVal = current + toAdd
    if (newVal > max) {
        return max
    } else if (newVal < min) {
        return min
    } else {
        return newVal
    }
}

export function createRows(
    elements: any,
    rowIndices: number[],
): Array<Array<any>> {
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

export function getActionRow(
    buttonLabels: Array<string>,
    buttonStyles: MessageButtonStyleResolvable[] = [],
) {
    const row = new MessageActionRow()
    for (let i = 0; i < buttonLabels.length; i++) {
        const label = buttonLabels[i]
        const button = new MessageButton().setLabel(label).setCustomId(label)

        i < buttonStyles.length
            ? button.setStyle(buttonStyles[i])
            : button.setStyle('PRIMARY')
        row.addComponents(button)
    }
    return row
}

export function getSingleInteraction(player: Player, message: Message) {
    const collector = message.createMessageComponentCollector({
        filter: (interaction: ButtonInteraction) => {
            interaction.deferUpdate()
            return interaction.user.equals(player.user)
        },
        max: 1,
    })

    return {
        collected: new Promise((resolve, reject) => {
            collector.on('end', (collected, reason) => {
                if (reason === 'endgame') {
                    reject(new GameEndedError(`Game has ended`))
                }
                if (reason === 'setleader') {
                    reject(new NewLeaderError('New Leader selected'))
                }
                if (reason === `removeplayer`) {
                    reject(new CollectorPlayerLeftError(`Player Removed`))
                }
                if (collected.size === 0) {
                    reject(new CollectorPlayerLeftError(`Collector stopped`))
                    return
                }

                resolve(collected.first() as ButtonInteraction)
            })
        }) as Promise<ButtonInteraction>,
        collector: collector as InteractionCollector<ButtonInteraction>,
    }
}

export function getInteractionCollector(
    player: Player,
    message: Message,
): InteractionCollector<ButtonInteraction> {
    return message.createMessageComponentCollector({
        filter: interaction => {
            interaction.deferUpdate()
            return interaction.user.equals(player.user)
        },
    })
}

// Fails the given function silently if the caught error is in the given errorCodes
export async function failSilently(func: () => void, errorCodes: number[]) {
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

export async function removeMessage(message: Message) {
    return failSilently(message.delete.bind(message), [
        DiscordErrors.UNKNOWN_MESSAGE,
    ])
}
