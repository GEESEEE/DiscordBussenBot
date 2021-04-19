module.exports = {
    name : "play",
    desc : "Starts the game of Bussen after people have joined!",
    async execute(client, message, args) {
        if (client.readyToPlay(message.author)) {
            message.channel.send(`${message.author.username} has started the Game!`)
            await client.currentGame.play(message.channel)
            client.currentGame = null
        }
    }
}