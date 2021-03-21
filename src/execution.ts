import { ReexecuteInterrupt } from "./interrupt";

export interface Execution<T> {
    run(): T;
    toString(): string;
}

export class SuccessExecution<T> implements Execution<T> {
    constructor(
        private readonly value: T,
    ) { }

    run(): T {
        return this.value;
    }

    toString(): string {
        return typeof this.value;
    }
}

export class FailureExecution<T> implements Execution<T> {
    constructor(
        private readonly error: any,
    ) { }

    run(): T {
        throw this.error;
    }

    toString(): string {
        return `err(${this.error.constructor.name})`;
    }
}

export class UnknownExecution implements Execution<unknown> {
    run(): unknown {
        throw new ReexecuteInterrupt();
    }

    toString(): string {
        return '->';
    }
}
