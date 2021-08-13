import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Message, MessageEmbed } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription(
            'Displays all possible commands and their descriptions',
        ),
    async execute(client: Client, interaction: CommandInteraction) {
        const server = client.serverManager.getServer(interaction.guild!.id)
        if (server?.readyToHelpInteraction(interaction)) {
            const embed = new MessageEmbed()

            const commands = []
            for (const command of client.slashCommands.values()) {
                const args = 'args'

                commands.push(
                    `**/${command.data.name}** ${args}: ${command.data.description}\n`,
                )
            }

            embed
                .setTitle(`Here is a list of commands:`)
                .setDescription(commands.join(''))

            return interaction.reply({ embeds: [embed] })
        }
    },
}
