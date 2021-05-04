module.exports = {
    name: 'removegame',
    aliases: ['remove'],
    desc: `Creates a vote to remove the current game.`,
    execute(client, message, args) {
        const server = message.guild
        if (server.readyToRemove(message)) {
            return server.removeGameVote(message)
        }
    },
}
