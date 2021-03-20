import { Execution, FailureExecution, SuccessExecution } from "./execution";
import { AsyncInterrupt } from "./interrupt";

export type SyncFunction = (...params: any)=> any;

let queue: Execution<any>[] = [];

export function wait<T>(provider: () => Promise<T>): T {
    if(queue.length) {
        return queue.shift().run();
    }

    throw new AsyncInterrupt<T>(provider());
}

export function state<T>(fn: () => T): T {
    return wait(async () => fn());
}

export function affect(fn: () => any): void {
    state(fn);
}

export function except(e: any): void {
    if(e instanceof AsyncInterrupt) {
        throw e;
    }
}

export function resync<F extends SyncFunction>(fn: F):
        (...params: Parameters<F>) => Promise<ReturnType<F>> {

    async function runEvaluation(fnQueue: any[], ...params: Parameters<F>): Promise<ReturnType<F>> {
        try {
            queue = [...fnQueue];
            const value = fn(...params as any);
            if(queue.length) {
                throw new Error('Resync evaluation differed between runs, make sure impure functions are called inside state()');
            }
            return value;
        } catch(e) {
            if(!(e instanceof AsyncInterrupt)) {
                throw e;
            }

            await e.promise
                .then(v => fnQueue.push(new SuccessExecution(v)))
                .catch(e => fnQueue.push(new FailureExecution(e)));
            return await runEvaluation(fnQueue, ...params as any);
        }
    }

    return async (...params) => await runEvaluation([], ...params);
}
