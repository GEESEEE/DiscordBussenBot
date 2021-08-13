import { Collection, Snowflake } from 'discord.js'

import { Server } from '../structures/Server'

export class ServerManager {
    servers: Collection<Snowflake, Server>

    constructor() {
        this.servers = new Collection()
    }

    addServer(guildId: Snowflake): Server | undefined {
        if (typeof this.servers.get(guildId) === 'undefined') {
            this.servers.set(guildId, new Server())
        }
        return this.servers.get(guildId)
    }

    getServer(guildId: Snowflake): Server | undefined {
        return this.servers.get(guildId)
    }
}
