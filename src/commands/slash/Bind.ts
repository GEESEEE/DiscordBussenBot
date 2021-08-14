import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Binds the bot to the channel this is called in'),
    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.addServer(interaction.guild!.id)

        if (server?.currentGame === null) {
            server.currentChannel = interaction.channel
            await interaction.reply({
                content: `Bot was successfully bound to this channel`,
            })
        }
    },
}
