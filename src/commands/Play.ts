module.exports = {
    name: 'play',
    desc: 'Starts the game after people have joined',
    async execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToPlay(message)) {
            await guild.currentGame.play()
            guild.currentGame = null
        }
    },
}
