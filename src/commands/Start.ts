import Bussen from '../game/games/Bussen'
import { capitalizeFirstLetter } from '../utils/Utils'

module.exports = {
    name: 'start',
    aliases: ['s'],
    desc: 'Used to initiate a game',
    args: [`gamename`],
    execute(client, message, args) {
        const server = client.serverManager.getServer(message.guild.id)
        if (server.readyToStart(message)) {
            const game = args[0]

            if (game && client.games.has(game)) {
                const gameClass = client.games.get(game).default
                server.currentGame = new gameClass(
                    capitalizeFirstLetter(game),
                    message.author,
                    message.channel,
                )
                return server.startGame()
            } else {
                server.currentGame = new Bussen(
                    'Bussen',
                    message.author,
                    message.channel,
                )
                return server.startGameInteraction()
            }
        }
    },
}
