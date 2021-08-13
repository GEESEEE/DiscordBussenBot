import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quitgame')
        .setDescription('Used to leave a game prematurely'),

    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)
        if (server?.readyToQuitInteraction(interaction)) {
            return server.removePlayer(interaction.user)
        }
    },
}
