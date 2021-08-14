import { REST } from '@discordjs/rest'
import Discord, { ClientOptions, Collection } from 'discord.js'
import { Routes } from 'discord-api-types/v9'
import dotenv from 'dotenv'

dotenv.config()

import { ServerManager } from '../managers/ServerManager'
import { readFolder } from '../utils/Utils'

const messageCommandFiles = readFolder('./src/commands/message')
const slashCommandFiles = readFolder('./src/commands/slash')
const gameFiles = readFolder('./src/game/games')
const eventFiles = readFolder('./src/events')

export class Client extends Discord.Client {
    messageCommands: Collection<string, any>
    slashCommands: Collection<string, any>
    slashCommandsData: any[]
    games: Collection<string, any>
    serverManager: ServerManager
    info!: Record<string, any>

    constructor(options: ClientOptions) {
        super(options)
        this.messageCommands = new Collection()
        this.slashCommands = new Collection()
        this.slashCommandsData = []
        this.games = new Collection()
        this.serverManager = new ServerManager()

        // Set slash
        for (const file of messageCommandFiles) {
            const command = require(`../commands/message/${file}`)
            this.messageCommands.set(command.name, command)
        }

        // Set slashCommands
        for (const file of slashCommandFiles) {
            const command = require(`../commands/slash/${file}`)
            this.slashCommands.set(command.data.name, command)
            this.slashCommandsData.push(command.data.toJSON())
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
                body: this.slashCommandsData,
            })
        } catch (error) {
            console.error(error)
        }
    }
}
