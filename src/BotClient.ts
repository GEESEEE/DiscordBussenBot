import Discord, { TextChannel } from 'discord.js'
const fs = require('fs')
const { prefix } = require('../config.json')

require('./Player')
require('./Server')

const commandFiles = fs
    .readdirSync('./src/commands')
    .filter(file => file.endsWith('.ts'))

const gameFiles = fs
    .readdirSync('./src/game/games')
    .filter(file => file.endsWith('.ts'))

export class BotClient extends Discord.Client {
    commands
    games

    constructor() {
        super()
        this.commands = new Discord.Collection()
        this.games = new Discord.Collection()

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`)
            this.commands.set(command.name, command)
        }

        for (const file of gameFiles) {
            const game = require(`./game/games/${file}`)
            this.games.set(file.toLowerCase().slice(0, -3), game)
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

        const args = message.content
            .toLowerCase()
            .slice(prefix.length)
            .trim()
            .split(/ +/)
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
