import Discord, { TextChannel } from 'discord.js'
const fs = require('fs')
const { prefix } = require('../config.json')

require('./Player')
require('./Server')

const commandFiles = fs
    .readdirSync('./src/commands')
    .filter(file => file.endsWith('.ts'))

class BotClient extends Discord.Client {
    commands

    constructor() {
        super()
        this.commands = new Discord.Collection()

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`)
            this.commands.set(command.name, command)
        }

        // this event will only trigger one time after logging in
        this.once('ready', this.onReady)

        this.on('message', this.onMessage)
    }

    onReady() {
        console.log('Ready!')
    }

    async onMessage(message) {
        if (
            !message.content.startsWith(prefix) ||
            !message.guild ||
            message.author.bot
        )
            return

        const args = message.content.slice(prefix.length).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()

        if (this.commands.has(commandName)) {
            await this.commands.get(commandName).execute(this, message, args)
        }

        for (const command of this.commands.values()) {
            if (command.aliases && command.aliases.includes(commandName)) {
                await command.execute(this, message, args)
            }
        }
    }
}

module.exports = BotClient
