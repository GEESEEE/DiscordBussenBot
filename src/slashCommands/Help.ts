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
            for (const command of client.commands.values()) {
                const alias =
                    command.aliases && command.aliases.length > 0
                        ? ', !' + command.aliases.join(', !')
                        : ''

                const args =
                    command.args && command.args.length > 0
                        ? '`' + `${command.args.join(' ')}` + '`'
                        : ``

                commands.push(
                    `**!${command.name}${alias}** ${args}: ${command.desc}\n`,
                )
            }

            embed
                .setTitle(`Here is a list of commands:`)
                .setDescription(commands.join(''))

            return interaction.reply({ embeds: [embed] })
        }
    },
}
