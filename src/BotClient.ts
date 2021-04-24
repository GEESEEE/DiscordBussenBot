import Discord, { TextChannel } from 'discord.js'

import { Bussen } from './Bussen'
import { ReactionStrings } from './utils/Consts'
import { getBinaryReactions } from './utils/Utils'

class BotClient extends Discord.Client {}

module.exports = BotClient
