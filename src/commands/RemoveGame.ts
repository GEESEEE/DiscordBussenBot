module.exports = {
    name: 'removegame',
    desc: `Creates a vote to remove the current game. Use this when you're locked out of the bot because the players of the game left.`,
    execute(client, message, args) {
        if (client.readyToRemove(message)) {
            return client.removeGame(message)
        }
    },
}
