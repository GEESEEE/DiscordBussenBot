import { Bussen } from '../Bussen'

module.exports = {
    name: 'start',
    desc: 'Used to initiate a game',
    execute(client, message, args) {
        if (!client.gameExists()) {
            client.currentGame = new Bussen(message.author, message.channel)
        }
    },
}
