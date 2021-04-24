import { MessageEmbed } from 'discord.js'

module.exports = {
    name: 'help',
    desc: 'Displays all possible commands and their descriptions',
    execute(client, message, args) {
        const embed = new MessageEmbed()
        const commands = client.commands
            .map(
                command =>
                    `**!${command.name}${
                        command.aliases && command.aliases.length > 0
                            ? ', !' + command.aliases.join(', !')
                            : ''
                    }**: ${command.desc}\n`,
            )
            .join('')

        embed.setTitle(`Here is a list of commands:`).setDescription(commands)

        return message.channel.send(embed)
    },
}
