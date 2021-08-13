import Discord, {
    ClientOptions,
    Collection,
    Interaction,
    Message,
} from 'discord.js'
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
    commands: Collection<string, any>
    games: Collection<string, any>
    serverManager: ServerManager

    constructor(options: ClientOptions) {
        super(options)
        this.commands = new Discord.Collection()
        this.games = new Discord.Collection()
        this.serverManager = new ServerManager()

        // Set commands from /src/commands
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`)
            this.commands.set(command.name, command)
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

        // Event for slash commands
        this.on('interactionCreate', this.onInteraction)
    }

    onReady() {
        console.log('Ready!')
    }

    async onMessage(message: Message) {
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
        const commandName = args.shift()?.toLowerCase()
        if (typeof commandName === 'undefined') return

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

    async onInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return
        console.log(interaction)
    }
}
