module.exports = {
    name: 'bind',
    desc: 'Binds the bot to the channel this is called in',
    execute(client, message, args) {
        const server = client.serverManager.addServer(message.guild.id)
        if (!server.gameExists()) {
            server.currentChannel = message.channel
            server.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
