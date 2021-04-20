module.exports = {
    name : "endgame",
    desc : "Used to end a game prematurely by the leader of the game",
    execute(client, message, args) {
        if (client.readyToEnd(message.author)) {
            return client.currentGame.endGame()
        }
    }
}