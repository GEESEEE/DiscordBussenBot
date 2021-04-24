module.exports = {
    name: 'join',
    aliases: ['j'],
    desc: 'Used to join a game after it has been started',
    execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToJoin(message)) {
            guild.currentGame.addPlayer(message.author)
            message.channel.send(
                `${message.author.username} has joined the game!`,
            )
        }
    },
}
