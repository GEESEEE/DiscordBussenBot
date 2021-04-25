module.exports = {
    name: 'quitgame',
    aliases: ['quit'],
    desc: 'Used to leave a game prematurely',
    execute(client, message, args) {
        const server = message.guild
        if (server.readyToQuit(message)) {
            return server.removePlayer(message.author)
        }
    },
}
