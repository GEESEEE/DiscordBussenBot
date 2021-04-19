const Discord = require('discord.js')


class BotClient extends Discord.Client {

    constructor(...args) {
        super(...args)
        this.currentGame = null
        this.currentChannel = null
    }

    readyToBind() {
        return !this.currentGame
    }

    readyToStart() {
        return !this.currentGame
    }

    readyToJoin(author) {
        return this.currentGame && !this.currentGame.hasStarted
            && !this.currentGame.players.find(player => player.id === author.id)
    }

    readyToPlay(author) {
        return this.currentGame && this.currentGame.isLeader(author) && !this.currentGame.hasStarted
    }

}





module.exports = BotClient