module.exports = {
    name: 'endgame',
    aliases: ['end'],
    desc: 'Leader can use this to end a game prematurely',
    execute(client, message, args) {
        const server = message.guild
        if (server.readyToEnd(message)) {
            return server.currentGame.endGame()
        }
    },
}
