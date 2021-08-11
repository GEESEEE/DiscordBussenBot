import { Intents } from 'discord.js'

const { Client } = require('./src/structures/Client')

const dotenv = require('dotenv')
dotenv.config()

const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
)

const client = new Client({
    intents: intents,
})

client.login(process.env.TOKEN)
