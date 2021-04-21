module.exports = {
    name: 'bind',
    desc: 'Binds the bot the channel this is last called in',
    execute(client, message, args) {
        if (!client.gameExists()) {
            client.currentChannel = message.channel
            client.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
