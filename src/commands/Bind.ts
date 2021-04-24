module.exports = {
    name: 'bind',
    desc: 'Binds the bot to the channel this is called in',
    execute(client, message, args) {
        if (!client.gameExists()) {
            client.currentChannel = message.channel
            client.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
