import { Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'quitgame',
    aliases: ['quit'],
    desc: 'Used to leave a game prematurely',
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        if (server?.readyToQuit(message)) {
            return server.removePlayer(message.author)
        }
    },
}
