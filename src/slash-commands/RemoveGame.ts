import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removegame')
        .setDescription('Creates a vote to remove the current game'),
    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)
        if (server?.readyToRemoveInteraction(interaction)) {
            await interaction.reply({
                content: `Starting vote to remove ${server?.currentGame?.name}`,
            })
            return server.removeGameVote()
        }
    },
}
