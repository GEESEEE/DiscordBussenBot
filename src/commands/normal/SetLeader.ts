import { Message } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    name: 'setleader',
    desc: 'Makes someone else leader',
    args: [`@player`],
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        const newPlayer = message.mentions.users.first()
        if (
            typeof newPlayer !== 'undefined' &&
            server?.readyToMakeLeader(message, newPlayer)
        ) {
            return server.currentGame?.setLeader(newPlayer)
        }
    },
}
