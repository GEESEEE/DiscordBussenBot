import { Intents } from 'discord.js'

const { Client } = require('./src/structures/Client')

const dotenv = require('dotenv')
dotenv.config()

const client = new Client({
    intents: [Intents.FLAGS.GUILD_MESSAGES],
})

client.login(process.env.TOKEN)
