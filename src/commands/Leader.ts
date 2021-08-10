module.exports = {
    name: 'leader',
    desc: 'Makes someone else leader',
    args: [`@player`],
    execute(client, message, args) {
        const server = client.serverManager.getServer(message.guild.id)
        const newPlayer = message.mentions.users.first()
        if (server.readyToMakeLeader(message, newPlayer)) {
            return server.currentGame.setLeader(newPlayer)
        }
    },
}
