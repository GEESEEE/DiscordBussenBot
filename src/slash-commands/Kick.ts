import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Leader can use this to kick a player during a game')
        .addUserOption(option =>
            option
                .setName('player')
                .setDescription('Player to kick from the game')
                .setRequired(true),
        ),
    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)
        const user = interaction.options.getUser('player')
        if (
            user !== null &&
            server?.readyToKickInteraction(interaction, user)
        ) {
            await interaction.reply({ content: `Kicking ${user}` })
            return server.removePlayer(user)
        }
    },
}
