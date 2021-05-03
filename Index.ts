const { BotClient } = require('./src/discordclasses/BotClient')
require(`./src/discordclasses/DiscordTypes`)

const dotenv = require('dotenv')
dotenv.config()

const client = new BotClient()

client.login(process.env.TOKEN)
