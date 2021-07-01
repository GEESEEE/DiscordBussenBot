module.exports = {
    name: 'leader',
    desc: 'Makes someone else leader',
    args: [`@player`],
    execute(client, message, args) {
        const server = message.guild
        const newPlayer = message.mentions.users.first()
        if (server.readyToMakeLeader(message, newPlayer)) {
            return server.currentGame.setLeader(newPlayer)
        }
    },
}