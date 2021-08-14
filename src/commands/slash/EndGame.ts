import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endgame')
        .setDescription('Leader can use this to end a game prematurely'),
    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.addServer(interaction.guild!.id)

        if (server?.readyToEndGame(interaction)) {
            try {
                await interaction.reply({
                    content: `Ending ${server?.currentGame?.name}`,
                })
                server.currentGame?.endGame()
            } catch {}
        }
    },
}
