import { SlashCommandBuilder } from '@discordjs/builders'
import { Interaction } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Binds the bot to the channel this is called in'),
    async execute(client: Client, interaction: Interaction) {
        const server = client.serverManager.addServer(interaction.guild!.id)

        if (server?.currentGame === null) {
            server.currentChannel = interaction.channel
            server.currentChannel!.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
