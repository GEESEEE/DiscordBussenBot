import { User } from 'discord.js'

module.exports = {
    name: 'passinput',
    desc: 'Passes the input to someone else',
    args: [`@player`],
    execute(client, message, args) {
        const server = client.serverManager.getServer(message.guild.id)
        const newPlayer = message.mentions.users.first()
        if (
            newPlayer instanceof User &&
            server.readyToPassInput(message, newPlayer)
        ) {
            server.currentGame.passInput(message.author, newPlayer)
        }
    },
}
