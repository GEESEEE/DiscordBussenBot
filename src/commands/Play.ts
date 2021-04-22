module.exports = {
    name: 'play',
    desc: 'Starts the game of Bussen after people have joined!',
    async execute(client, message, args) {
        if (client.readyToPlay(message)) {
            await client.currentGame.play()
            client.currentGame = null
        }
    },
}
