const fs = require('fs')
const Discord = require('discord.js')
const { prefix } = require('./config.json')

require('./src/Player')
const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
    const command = require(`./src/commands/${file}`)
    client.commands.set(command.name, command)
}

const dotenv = require('dotenv')
dotenv.config();

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log('Ready!');
});


client.on('message', async message => {
    console.log(message.content);

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (client.commands.has(command)) {
        await client.commands.get(command).execute(client, message, args)
    }
});



// ... client setup (keep reading)

client.login(process.env.TOKEN);