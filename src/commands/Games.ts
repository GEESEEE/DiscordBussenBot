import { MessageEmbed } from 'discord.js'

import { capitalizeFirstLetter } from '../utils/Utils'

module.exports = {
    name: `games`,
    desc: `Displays all games that can currently be played`,
    execute(client, message, args) {
        const server = client.getServer(message.guild.id)
        if (server.readyToShowGames(message)) {
            const embed = new MessageEmbed()

            const games = Array.from(client.games.keys())
                .map(name => `**${capitalizeFirstLetter(name)}**\n`)
                .join(``)

            embed.setTitle(`Here is a list of games:`).setDescription(games)
            return message.channel.send(embed)
        }
    },
}
