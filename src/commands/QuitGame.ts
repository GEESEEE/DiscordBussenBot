module.exports = {
    name: 'quitgame',
    aliases: ['quit'],
    desc: 'Used to leave a game prematurely',
    execute(client, message, args) {
        if (client.readyToQuit(message)) {
            return client.removePlayer(message.author)
        }
    },
}
