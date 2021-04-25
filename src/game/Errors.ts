export class GameEnded extends Error {
    constructor(message) {
        super(message)
    }
}

export class CollectorPlayerLeftError extends Error {
    constructor(message) {
        super(message)
    }
}
