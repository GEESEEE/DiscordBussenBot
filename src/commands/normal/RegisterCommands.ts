import { Message } from 'discord.js'

import { Client } from '../../structures/Client'

module.exports = {
    name: 'registercommands',
    description: 'Registers the slash commands for the bot',
    aliases: ['deploy'],
    execute(client: Client, message: Message, args: string[]) {
        if (message.author === client.application?.owner) {
            return client.registerCommands()
        }
    },
}
