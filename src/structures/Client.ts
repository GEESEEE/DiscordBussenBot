import Discord from 'discord.js'
import fs from 'fs'

import { prefix } from '../../config.json'
import { ServerManager } from '../managers/ServerManager'

const commandFiles = fs
    .readdirSync('./src/commands')
    .filter(file => file.endsWith('.ts'))

const gameFiles = fs
    .readdirSync('./src/game/games')
    .filter(file => file.endsWith('.ts'))

export class Client extends Discord.Client {
    commands
    games
    serverManager: ServerManager

    constructor(x) {
        super(x)
        this.commands = new Discord.Collection()
        this.games = new Discord.Collection()
        this.serverManager = new ServerManager()

        // Set commands from /src/commands
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`)
            if (command.name !== 'leader') {
                this.commands.set(command.name, command)
            }
        }

        // Set Playable Games
        for (const file of gameFiles) {
            const game = require(`../game/games/${file}`)
            this.games.set(file.toLowerCase().slice(0, -3), game)
        }

        // Event will fire once when initialized
        this.once('ready', this.onReady)

        // Event fires when bot detects a new message
        this.on('messageCreate', this.onMessage)
    }

    onReady() {
        console.log('Ready!')
    }

    async onMessage(message) {
        // If message not valid for this bot, ignore it
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

        // If command is valid, execute it
        if (this.commands.has(commandName)) {
            await this.commands.get(commandName).execute(this, message, args)
        }

        // If command is an alias, execute it
        for (const command of this.commands.values()) {
            if (command.aliases && command.aliases.includes(commandName)) {
                await command.execute(this, message, args)
            }
        }
    }
}
