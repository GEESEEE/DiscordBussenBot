export class GameEndedError extends Error {
    constructor(message: string) {
        super(message)
    }
}

export class CollectorPlayerLeftError extends Error {
    constructor(message: string) {
        super(message)
    }
}

export class CollectorPlayerPassedInput extends Error {
    constructor(message: string) {
        super(message)
    }
}
