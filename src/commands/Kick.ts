module.exports = {
    name: 'kick',
    desc: 'Leader can use this to kick a player during a game',
    execute(client, message, args) {
        const guild = message.guild
        const user = message.mentions.users.first()
        if (guild.readyToKick(message, user)) {
            return guild.removePlayer(user)
        }
    },
}
