import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Message } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setleader')
        .setDescription('Makes someone else leader')
        .addUserOption(option =>
            option
                .setName('player')
                .setDescription('The player you want to make the leader')
                .setRequired(true),
        ),

    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)
        const newLeader = interaction.options.getUser('player')
        if (
            newLeader !== null &&
            server?.readyToMakeLeaderInteraction(interaction)
        ) {
            await interaction.reply({
                content: `Making ${newLeader} the leader`,
            })
            return server.currentGame?.setLeader(newLeader)
        }
    },
}
