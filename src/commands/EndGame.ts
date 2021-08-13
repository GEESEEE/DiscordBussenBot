import { Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'endgame',
    aliases: ['end'],
    desc: 'Leader can use this to end a game prematurely',
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.addServer(message.guild!.id)

        if (server?.readyToEnd(message)) {
            try {
                server.currentGame?.endGame()
            } catch {}
        }
    },
}
