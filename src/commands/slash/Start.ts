import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Interaction, Message } from 'discord.js'

import Bussen from '../../game/games/Bussen'
import { Client } from '../../structures/Client'
import { capitalizeFirstLetter } from '../../utils/Utils'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Used to initiate a game')
        .addStringOption(option =>
            option
                .setName('gamename')
                .setDescription('The game you want to play')
                .setRequired(false)
                .addChoice('Bussen', 'bussen'),
        ),

    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)

        if (server?.readyToStartInteraction(interaction)) {
            const game = interaction.options.getString('gamename')

            if (game && client.games.has(game)) {
                const gameClass = client.games.get(game).default
                server.currentGame = new gameClass(
                    capitalizeFirstLetter(game),
                    interaction.user,
                    interaction.channel,
                )
                await interaction.reply({ content: `Starting ${game}` })
            } else {
                server.currentGame = new Bussen(
                    'Bussen',
                    interaction.user,
                    interaction.channel!,
                )
                await interaction.reply({ content: `Starting Bussen` })
            }
            return server.startGame()
        }
    },
}
