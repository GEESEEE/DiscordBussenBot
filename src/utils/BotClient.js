const Discord = require('discord.js')


class BotClient extends Discord.Client {

    constructor(...args) {
        super(...args)
        this.currentGame = null
        this.currentChannel = null
    }

    gameExists() {
        return this.currentGame
    }

    readyToJoin(author) {
        return this.gameExists() && !this.currentGame.hasStarted
            && !this.currentGame.players.some(player => player.equals(author))
    }

    readyToPlay(author) {
        return this.gameExists() && this.currentGame.isLeader(author) && !this.currentGame.hasStarted
    }

    readyToQuit(author) {
        return this.gameExists() && this.currentGame.players.includes(author)
    }

    readyToKick(leader, player) {
        return (this.gameExists() && this.currentGame.isLeader(leader) && this.currentGame.isPlayer(player))
    }

    readyToEnd(author) {
        return this.gameExists() && this.currentGame?.isLeader(author)
    }

}


module.exports = BotClient