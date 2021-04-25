module.exports = {
    name: 'kick',
    desc: 'Leader can use this to kick a player during a game',
    args: [`@player`],
    execute(client, message, args) {
        const server = message.guild
        const user = message.mentions.users.first()
        if (server.readyToKick(message, user)) {
            return server.removePlayer(user)
        }
    },
}
