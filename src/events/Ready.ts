import { Client } from '../structures/Client'

module.exports = {
    name: 'ready',
    once: true,
    async execute(client: Client) {
        client.info = (await client.application?.fetch()) as Record<string, any>
        console.log('Ready!')
    },
}
