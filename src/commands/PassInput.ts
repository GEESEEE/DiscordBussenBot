import { Message, User } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'passinput',
    desc: 'Passes the input to someone else',
    args: [`@player`],
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.getServer(message.guild!.id)
        const newPlayer = message.mentions.users.first()
        if (
            newPlayer instanceof User &&
            server?.readyToPassInput(message, newPlayer)
        ) {
            server.currentGame?.passInput(message.author, newPlayer)
        }
    },
}
