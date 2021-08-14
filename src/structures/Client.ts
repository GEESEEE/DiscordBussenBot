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

function readFolder(path: string) {
    return fs.readdirSync(path).filter(file => file.endsWith('.ts'))
}

const commandFiles = readFolder('./src/commands/normal')
const slashCommandFiles = readFolder('./src/commands/slash')
const gameFiles = readFolder('./src/game/games')

export class Client extends Discord.Client {
    commands: Collection<string, any>
    slashCommands: Collection<string, any>
    slashCommandList: any[]
    games: Collection<string, any>
    serverManager: ServerManager
    info!: Record<string, any>

    constructor(options: ClientOptions) {
        super(options)
        this.commands = new Collection()
        this.slashCommands = new Collection()
        this.slashCommandList = []
        this.games = new Collection()
        this.serverManager = new ServerManager()

        // Set commands from /src/commands
        for (const file of commandFiles) {
            const command = require(`../commands/normal/${file}`)
            this.commands.set(command.name, command)
        }

        // Set slashCommands
        for (const file of slashCommandFiles) {
            const command = require(`../commands/slash/${file}`)
            this.slashCommands.set(command.data.name, command)
            this.slashCommandList.push(command.data.toJSON())
        }

        // Set Playable Games
        for (const file of gameFiles) {
            const game = require(`../game/games/${file}`)
            this.games.set(file.toLowerCase().slice(0, -3), game) // Slice off file extension
        }

        // Event will fire once when initialized
        this.once('ready', this.onReady)

        // Event fires when bot detects a new message
        this.on('messageCreate', this.onMessage)

        // Event for slash commands
        this.on('interactionCreate', this.onInteraction)
    }

    async setClientInfo() {
        const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!)
        try {
            this.info = (await rest.get(
                Routes.oauth2CurrentApplication(),
            )) as Record<string, any>
        } catch (err) {
            console.error(err)
        }
    }

    async registerCommands() {
        const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!)
        try {
            await rest.put(Routes.applicationCommands(this.info.id), {
                body: this.slashCommandList,
            })
        } catch (error) {
            console.error(error)
        }
    }

    async onReady() {
        await this.setClientInfo()
        console.log('Ready!')
    }

    async onInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return
        if (!this.slashCommands.has(interaction.commandName)) return

        try {
            await this.slashCommands
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
