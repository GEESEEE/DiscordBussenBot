import { Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'removegame',
    aliases: ['remove'],
    desc: `Creates a vote to remove the current game.`,
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        if (server?.readyToRemove(message)) {
            return server.removeGameVote()
        }
    },
}
