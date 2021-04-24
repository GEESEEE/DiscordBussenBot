export class GameEnded extends Error {
    constructor(message) {
        super(message)
    }
}

export class CollectorError extends Error {
    constructor(message) {
        super(message)
    }
}
