module.exports = {
    name: 'endgame',
    aliases: ['end'],
    desc: 'Leader can use this to end a game prematurely',
    execute(client, message, args) {
        if (client.readyToEnd(message)) {
            return client.currentGame.endGame()
        }
    },
}
