import { Message } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    name: 'kick',
    desc: 'Leader can use this to kick a player during a game',
    args: [`@player`],
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        const user = message.mentions.users.first()
        if (typeof user !== 'undefined' && server?.readyToKick(message, user)) {
            return server.removePlayer(user)
        }
    },
}
