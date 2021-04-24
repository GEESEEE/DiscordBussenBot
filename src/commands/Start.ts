import Bussen from '../game/games/Bussen'

module.exports = {
    name: 'start',
    aliases: ['s'],
    desc: 'Used to initiate a game',
    execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToStart(message)) {
            const game = args[0]

            if (game && client.games.has(game)) {
                const gameClass = client.games.get(game).default
                guild.currentGame = new gameClass(
                    game,
                    message.author,
                    message.channel,
                )
            } else {
                guild.currentGame = new Bussen(
                    'Bussen',
                    message.author,
                    message.channel,
                )
            }
        }
    },
}
