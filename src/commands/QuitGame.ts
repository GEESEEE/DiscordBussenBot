module.exports = {
    name: 'quitgame',
    aliases: ['quit'],
    desc: 'Used to leave a game prematurely',
    execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToQuit(message)) {
            return guild.removePlayer(message.author)
        }
    },
}
