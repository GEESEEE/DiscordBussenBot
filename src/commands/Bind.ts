module.exports = {
    name: 'bind',
    desc: 'Binds the bot to the channel this is called in',
    execute(client, message, args) {
        const guild = message.guild
        if (!guild.gameExists()) {
            guild.currentChannel = message.channel
            guild.currentChannel.send(
                `Bot was successfully bound to this channel`,
            )
        }
    },
}
