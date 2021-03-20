export interface Execution<T> {
    run(): T;
}

export class SuccessExecution<T> implements Execution<T> {
    constructor(
        private readonly value: T,
    ) { }

    run(): T {
        return this.value;
    }
}

export class FailureExecution<T> implements Execution<T> {
    constructor(
        private readonly error: any,
    ) { }

    run(): T {
        throw this.error;
    }
}
