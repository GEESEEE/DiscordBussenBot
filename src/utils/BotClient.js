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
            && !this.currentGame.players.some(player => player.equals(author))
    }

    readyToPlay(author) {
        return this.currentGame && this.currentGame.isLeader(author) && !this.currentGame.hasStarted
    }

    readyToQuit(author) {
        return this.currentGame && this.currentGame.players.includes(author)
    }

    readyToKick(leader, player) {
        return (this.currentGame && this.currentGame.isLeader(leader) && this.currentGame.isPlayer(player))
    }

    removePlayer(player) {
        this.currentGame.removePlayer(player)
        if (this.currentGame.players.length === 0) {
            delete this.currentGame
        }
    }


}


module.exports = BotClient