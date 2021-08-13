import { Message, MessageEmbed } from 'discord.js'

import { Client } from '../../structures/Client'
import { capitalizeFirstLetter } from '../../utils/Utils'

module.exports = {
    name: `games`,
    desc: `Displays all games that can currently be played`,
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.addServer(message.guild!.id)

        if (server?.readyToShowGames(message)) {
            const embed = new MessageEmbed()

            const games = Array.from(client.games.keys())
                .map(name => `**${capitalizeFirstLetter(name)}**\n`)
                .join(``)

            embed.setTitle(`Here is a list of games:`).setDescription(games)
            return message.channel.send({ embeds: [embed] })
        }
    },
}
