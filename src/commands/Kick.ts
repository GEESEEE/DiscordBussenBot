module.exports = {
    name: 'kick',
    desc: 'Leader can use this to kick a player during a game',
    execute(client, message, args) {
        const user = message.mentions.users.first()
        if (client.readyToKick(message, user)) {
            return client.removePlayer(user)
        }
    },
}
