module.exports = {
    name: 'kick',
    desc: "Used to kick a player during a game if you're the leader",
    execute(client, message, args) {
        const user = message.mentions.users.first()
        if (client.readyToKick(message, user)) {
            console.log(`yes ${user}`)
            return client.currentGame.removePlayer(user)
        }
    },
}
