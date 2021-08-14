import { Message } from 'discord.js'

import { prefix } from '../../config.json'
import { Client } from '../structures/Client'

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message: Message, client: Client) {
        if (
            !message.content.startsWith(prefix) ||
            !message.guild ||
            message.author.bot
        )
            return

        const args = message.content
            .toLowerCase()
            .slice(prefix.length)
            .trim()
            .split(/ +/)
        const commandName = args.shift()?.toLowerCase()

        if (typeof commandName === 'undefined') return

        // If command is valid, execute it
        if (client.commands.has(commandName)) {
            await client.commands
                .get(commandName)
                .execute(client, message, args)
        }

        // If command is an alias, execute it
        for (const command of client.commands.values()) {
            if (command.aliases && command.aliases.includes(commandName)) {
                await command.execute(client, message, args)
            }
        }
    },
}
