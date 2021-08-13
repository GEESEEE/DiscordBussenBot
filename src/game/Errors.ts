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

export class NewLeaderError extends Error {
    constructor(message: string) {
        super()
    }
}
