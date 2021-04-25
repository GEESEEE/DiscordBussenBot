module.exports = {
    name: 'play',
    aliases: ['p'],
    desc: 'Starts the game after people have joined',
    async execute(client, message, args) {
        const server = message.guild
        if (server.readyToPlay(message)) {
            await server.currentGame.play()
            server.currentGame = null
        }
    },
}
