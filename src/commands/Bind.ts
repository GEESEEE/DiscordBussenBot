module.exports = {
    name: 'bind',
    desc: 'Binds the bot to the channel this is called in',
    execute(client, message, args) {
        const server = message.guild
        if (!server.gameExists()) {
            server.currentChannel = message.channel
            server.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
