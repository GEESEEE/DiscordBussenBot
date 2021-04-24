import { Bussen } from '../Bussen'

module.exports = {
    name: 'start',
    desc: 'Used to initiate a game',
    execute(client, message, args) {
        const guild = message.guild
        if (!guild.gameExists()) {
            guild.currentGame = new Bussen(message.author, message.channel)
        }
    },
}
