import { REST } from '@discordjs/rest'
import Discord, {
    ClientApplication,
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

const commandFiles = readFolder('./src/message-commands')
const slashCommandFiles = readFolder('./src/slash-commands')
const gameFiles = readFolder('./src/game/games')
const eventFiles = readFolder('./src/events')

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

        // Set slash-commands
        for (const file of commandFiles) {
            const command = require(`./src/message-commands/${file}`)
            this.commands.set(command.name, command)
        }

        // Set slashCommands
        for (const file of slashCommandFiles) {
            const command = require(`./src/slash-commands/${file}`)
            this.slashCommands.set(command.data.name, command)
            this.slashCommandList.push(command.data.toJSON())
        }

        // Set Playable Games
        for (const file of gameFiles) {
            const game = require(`../game/games/${file}`)
            this.games.set(file.toLowerCase().slice(0, -3), game) // Slice off file extension
        }

        // Set EventListeners
        for (const file of eventFiles) {
            const event = require(`../events/${file}`)
            if (event.once) {
                this.once(event.name, (...args) => event.execute(...args, this))
            } else {
                this.on(event.name, (...args) => event.execute(...args, this))
            }
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
}
