export class GameEndedError extends Error {
    constructor(message) {
        super(message)
    }
}

export class CollectorPlayerLeftError extends Error {
    constructor(message) {
        super(message)
    }
}

export class CollectorPlayerPassedInput extends Error {
    constructor(message) {
        super(message)
    }
}
