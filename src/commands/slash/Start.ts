import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction } from 'discord.js'

import { Client } from '../../structures/Client'
import { gameFolders } from '../../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Used to initiate a game')
        .addStringOption(option => {
            option
                .setName('gamename')
                .setDescription('The game you want to play')
                .setRequired(true)
            for (const game of gameFolders) {
                option.addChoice(game, game)
            }
            return option
        }),

    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)

        if (server?.readyToStartGame(interaction)) {
            const gameName = interaction.options.getString('gamename')
            if (gameName && client.games.has(gameName)) {
                const gameClass = client.games.get(gameName).default
                const game = new gameClass(
                    gameName,
                    interaction.user,
                    interaction.channel,
                )
                await interaction.reply({ content: `Starting ${gameName}` })
                return server.startGame(game)
            }
        }
    },
}
