export class AsyncInterrupt<T> {
    constructor(
        public readonly promise: Promise<T>,
    ) { }
}
