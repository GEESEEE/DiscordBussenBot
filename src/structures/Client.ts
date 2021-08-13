import { REST } from '@discordjs/rest'
import Discord, {
    ClientOptions,
    Collection,
    Interaction,
    Message,
} from 'discord.js'
import { Routes } from 'discord-api-types/v9'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

import { prefix } from '../../config.json'
import { ServerManager } from '../managers/ServerManager'

const slashCommandFiles = fs
    .readdirSync('./src/slashCommands')
    .filter(file => file.endsWith('.ts'))

const commandFiles = fs
    .readdirSync('./src/commands')
    .filter(file => file.endsWith('.ts'))

const gameFiles = fs
    .readdirSync('./src/game/games')
    .filter(file => file.endsWith('.ts'))

export class Client extends Discord.Client {
    commands: Collection<string, any>
    slashCommands: Collection<string, any>
    slashCommandList: any[]
    games: Collection<string, any>
    serverManager: ServerManager

    constructor(options: ClientOptions) {
        super(options)
        this.commands = new Collection()
        this.slashCommands = new Collection()
        this.slashCommandList = []
        this.games = new Collection()
        this.serverManager = new ServerManager()

        // Set commands from /src/commands
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`)
            this.commands.set(command.name, command)
        }

        // Set slashCommands
        for (const file of slashCommandFiles) {
            const command = require(`../slashCommands/${file}`)
            this.slashCommands.set(command.data.name, command)
            this.slashCommandList.push(command.data.toJSON())
        }

        // Set Playable Games
        for (const file of gameFiles) {
            const game = require(`../game/games/${file}`)
            this.games.set(file.toLowerCase().slice(0, -3), game) // Slice off file extension
        }

        this.registerCommands()

        // Event will fire once when initialized
        this.once('ready', this.onReady)

        // Event fires when bot detects a new message
        this.on('messageCreate', this.onMessage)

        // Event for slash commands
        this.on('interactionCreate', this.onInteraction)
    }

    async registerCommands() {
        const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!)
        try {
            console.log('Attempting to register Slash Commands')
            await rest.put(Routes.applicationCommands('873663168801566741'), {
                body: this.slashCommandList,
            })
            console.log('Slash Commands registered')
        } catch (error) {
            console.error(error)
        }
    }

    onReady() {
        console.log('Ready!')
    }

    async onInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return
        console.log(interaction)
        if (!this.commands.has(interaction.commandName)) return

        try {
            await this.commands
                .get(interaction.commandName)
                .execute(this, interaction)
        } catch (err) {
            console.error(err)
            await interaction.reply({
                content: 'Could not execute this command!',
                ephemeral: true,
            })
        }
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
}
