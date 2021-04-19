const Bussen = require('./../Bussen')

module.exports = {
    name : "begin",
    description : "Used to begin a game!",
    execute(client, message, args) {
        if (!client.currentGame) {
            client.currentGame = new Bussen(message.author)
            message.channel.send("Starting game with " + message.author.username)
            message.channel.send("Type '!join' to join the game")
        }
    }
}