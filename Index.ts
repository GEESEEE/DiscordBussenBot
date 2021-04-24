const fs = require('fs')
const Discord = require('discord.js')
const { prefix } = require('./config.json')
const BotClient = require('./src/BotClient')

require('./src/Player')
const client = new BotClient()
client.commands = new Discord.Collection()

const commandFiles = fs
    .readdirSync('./src/commands')
    .filter(file => file.endsWith('.ts'))

for (const file of commandFiles) {
    const command = require(`./src/commands/${file}`)
    client.commands.set(command.name, command)
}

const dotenv = require('dotenv')
dotenv.config()

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log('Ready!')
})

client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return

    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    if (client.commands.has(commandName)) {
        await client.commands.get(commandName).execute(client, message, args)
    }

    for (const command of client.commands.values()) {
        if (command.aliases && command.aliases.includes(commandName)) {
            await command.execute(client, message, args)
        }
    }
})

client.login(process.env.TOKEN)
