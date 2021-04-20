/*module.exports = {
    name: "kick",
    desc: "Used to kick a player during a game if you're the leader",
    execute(client, message, args) {
        let player = args[0].slice(2, -1)
        if (player.startsWith('!')) {
            player = player.slice(1)
        }
        const user = client.currentGame.getPlayer(player)
        console.log(`${args} and ${player} and ${user}`)
        if (user && client.readyToKick(message.author, user)) {
            client.removePlayer(user)
        }

    }
}*/
