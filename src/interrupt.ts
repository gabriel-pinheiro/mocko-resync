export class AsyncInterrupt<T> extends Error{
    constructor(
        public readonly promise: Promise<T>,
    ) { super(); }
}

export class ReexecuteInterrupt { }
