module.exports = {
    name : "join",
    description : "Used to join a game!",
    execute(client, message, args) {
        if (client.currentGame && !client.currentGame.hasStarted
            && !client.currentGame.players.find(player => player.id === message.author.id)) {

            client.currentGame.addPlayer(message.author)
            message.channel.send(`${message.author.username} has joined the game!`)
        }
    }

}