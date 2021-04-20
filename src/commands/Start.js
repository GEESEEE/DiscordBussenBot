const Bussen = require('./../Bussen')

module.exports = {
    name : "start",
    desc : "Used to initiate a game of Bussen",
    execute(client, message, args) {
        if (!client.gameExists()) {
            client.currentGame = new Bussen(message.author, message.channel)

        }
    }
}