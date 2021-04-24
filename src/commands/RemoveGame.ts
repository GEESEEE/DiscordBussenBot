module.exports = {
    name: 'removegame',
    aliases: ['remove'],
    desc: `Creates a vote to remove the current game.`,
    execute(client, message, args) {
        if (client.readyToRemove(message)) {
            return client.removeGame(message)
        }
    },
}
