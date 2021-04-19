module.exports = {
    name : "start",
    description : "Starts a game!",
    async execute(client, message, args) {
        if (client.currentGame && client.currentGame.isLeader(message.author)) {
            message.channel.send(`${message.author.username} has started the Game!`)
            await client.currentGame.start(message.channel)

        }
    }
}