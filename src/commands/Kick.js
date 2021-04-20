const {GuildMember} = require(`discord.js`)

module.exports = {
    name: "kick",
    desc: "Used to kick a player during a game if you're the leader",
    execute(client, message, args) {
        const user = message.mentions.first()
        if (user && user instanceof GuildMember && client.readyToKick(message.author, user)) {
            return client.currentGame.removePlayer(user)
        }

    }
}
