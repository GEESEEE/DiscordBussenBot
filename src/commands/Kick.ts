module.exports = {
    name: "kick",
    desc: "Used to kick a player during a game if you're the leader",
    execute(client, message, args) {
        const user = message.mentions.first()
        if (client.readyToKick(message, user)) {
            return client.currentGame.removePlayer(user)
        }

    }
}
