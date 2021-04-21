module.exports = {
    name : "join",
    desc : "Used to join a game after it has been initiated",
    execute(client, message, args) {
        if (client.readyToJoin(message)) {

            client.currentGame.addPlayer(message.author)
            message.channel.send(`${message.author.username} has joined the game!`)
        }
    }

}