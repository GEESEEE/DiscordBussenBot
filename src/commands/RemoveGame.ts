import { measureMemory } from 'vm'

module.exports = {
    name: 'removegame',
    aliases: ['remove'],
    desc: `Creates a vote to remove the current game.`,
    execute(client, message, args) {
        const guild = message.guild
        if (guild.readyToRemove(message)) {
            return guild.removeGame(message)
        }
    },
}
