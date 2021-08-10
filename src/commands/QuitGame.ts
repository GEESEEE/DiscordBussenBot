module.exports = {
    name: 'quitgame',
    aliases: ['quit'],
    desc: 'Used to leave a game prematurely',
    execute(client, message, args) {
        const server = client.serverManager.getServer(message.guild.id)
        if (server.readyToQuit(message)) {
            return server.removePlayer(message.author)
        }
    },
}
