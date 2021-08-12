import { Message, MessageEmbed } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'help',
    desc: 'Displays all possible commands and their descriptions',
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        if (server?.readyToHelp(message)) {
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

            return message.channel.send({ embeds: [embed] })
        }
    },
}
