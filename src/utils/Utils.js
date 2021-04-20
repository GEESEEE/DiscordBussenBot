
function getPrompt(channel, filter) {
    const collector = channel.createMessageCollector(filter, { max : 1 })

    return {message : new Promise(resolve => {
        collector.on('end', collected => {
            resolve(collected.first())
        })
    }), collector}
}

function filter(user, answer) {
    return m => {
        return answer.test(m.content) && m.author.equals(user)
    }
}

module.exports = {getPrompt, filter}