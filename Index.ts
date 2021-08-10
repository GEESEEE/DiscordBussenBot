const { Client } = require('./src/structures/Client')

const dotenv = require('dotenv')
dotenv.config()

const client = new BotClient()

client.login(process.env.TOKEN)
