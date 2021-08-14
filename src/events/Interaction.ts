import { Interaction } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction: Interaction, client: Client) {
        if (!interaction.isCommand()) return
        if (!client.slashCommands.has(interaction.commandName)) return

        try {
            await client.slashCommands
                .get(interaction.commandName)
                .execute(client, interaction)
        } catch (err) {
            console.error(err)
            await interaction.reply({
                content: 'Could not execute this command!',
                ephemeral: true,
            })
        }
    },
}
