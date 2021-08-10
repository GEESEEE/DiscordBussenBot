const { BotClient } = require('./src/discordclasses/BotClient')

const dotenv = require('dotenv')
dotenv.config()

const client = new BotClient()

client.login(process.env.TOKEN)
