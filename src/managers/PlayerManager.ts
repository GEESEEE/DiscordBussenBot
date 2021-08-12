import { Collection, Snowflake, User } from 'discord.js'

import { Player } from '../structures/Player'

export class PlayerManager {
    playerCollection: Collection<Snowflake, Player>

    constructor() {
        this.playerCollection = new Collection()
    }

    get players(): Player[] {
        return [...this.playerCollection.values()]
    }

    addUser(user: User) {
        this.playerCollection.set(user.id, new Player(user))
    }

    addPlayer(player: Player) {
        this.playerCollection.set(player.user.id, player)
    }

    isPlayer(user: User): boolean {
        return typeof this.getPlayer(user.id) !== 'undefined'
    }

    getPlayer(id: Snowflake): Player | undefined {
        return this.playerCollection.get(id)
    }

    removePlayer(id: Snowflake): boolean {
        return this.playerCollection.delete(id)
    }

    clear(): void {
        this.playerCollection = new Collection()
    }
}
