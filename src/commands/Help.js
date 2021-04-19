
module.exports = {
    name : "help",
    desc : "Displays all possible commands and their descriptions",
    execute(client, message, args) {
        const commands = client.commands.map(command => `!${command.name}: ${command.desc}\n`).join("")
        message.channel.send(`${message.author} here is a list of commands:\n${commands}`)
    }
}