import { Message } from 'discord.js'

import { Client } from '../structures/Client'

module.exports = {
    name: 'bind',
    desc: 'Binds the bot to the channel this is called in',
    execute(client: Client, message: Message, args: string[]) {
        const server = client.serverManager.addServer(message.guild!.id)

        if (server?.currentGame === null) {
            server.currentChannel = message.channel
            server.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
