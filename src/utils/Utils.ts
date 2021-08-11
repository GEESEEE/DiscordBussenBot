import {
    ButtonInteraction,
    DiscordAPIError,
    InteractionCollector,
    MessageActionRow,
    MessageButton,
} from 'discord.js'

import { CollectorPlayerLeftError, GameEndedError } from '../game/Errors'
import { Player } from '../structures/Player'
import { DiscordErrors } from './Consts'

export function sum(n) {
    return (Math.pow(n, 2) + n) / 2
}

export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
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

export function getActionRow(buttonLabels: Array<string>, buttonStyles = []) {
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

export function getSingleInteraction(player: Player, message) {
    const collector = message.createMessageComponentCollector({
        filter: interaction => {
            interaction.deferUpdate()
            return interaction.user.equals(player.user)
        },
        max: 1,
    })

    return {
        collected: new Promise((resolve, reject) => {
            collector.on('end', (collected, reason) => {
                if (reason === 'endgame') {
                    reject(new GameEndedError('Game Ended'))
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
    message,
): InteractionCollector<ButtonInteraction> {
    return message.createMessageComponentCollector({
        filter: interaction => {
            interaction.deferUpdate()
            return interaction.user.equals(player.user)
        },
    })
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
