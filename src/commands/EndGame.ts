module.exports = {
    name: 'endgame',
    aliases: ['end'],
    desc: 'Leader can use this to end a game prematurely',
    execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToEnd(message)) {
            return guild.currentGame.endGame()
        }
    },
}
