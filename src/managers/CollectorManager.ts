import {
    ButtonInteraction,
    InteractionCollector,
    MessageCollector,
    ReactionCollector,
} from 'discord.js'

import { Player } from '../structures/Player'

export class CollectorManager {
    collector:
        | MessageCollector
        | ReactionCollector
        | InteractionCollector<ButtonInteraction>
        | undefined

    player: Player | undefined
    askLeader: boolean

    constructor() {
        this.askLeader = false
    }

    set(
        collector:
            | MessageCollector
            | ReactionCollector
            | InteractionCollector<ButtonInteraction>,
        player: Player,
        askLeader?: boolean,
    ) {
        this.collector = collector
        this.player = player
        this.askLeader = askLeader ?? false
    }

    stop(reason?: string) {
        this.collector?.stop(reason ?? '')
    }

    check(player: Player) {
        return this.collector && this.player?.equals(player)
    }
}
