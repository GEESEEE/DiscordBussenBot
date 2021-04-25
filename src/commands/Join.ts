module.exports = {
    name: 'join',
    aliases: ['j'],
    desc: 'Used to join a game after it has been started',
    execute(client, message, args) {
        const server = message.guild
        if (server.readyToJoin(message)) {
            server.currentGame.addPlayer(message.author)
            message.channel.send(
                `${message.author.username} has joined the game!`,
            )
        }
    },
}
