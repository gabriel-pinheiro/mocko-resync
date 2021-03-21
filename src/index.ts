import { Execution } from "./execution";
import { AsyncInterrupt, ReexecuteInterrupt } from "./interrupt";
import { ExecutionState } from "./state";

const debug = require('debug')('mocko:resync');

let queue: Execution<any>[] = [];

export function wait<T>(provider: () => Promise<T>): T {
    if(queue.length) {
        try {
            return queue.shift().run();
        } catch(e) {
            if(!(e instanceof ReexecuteInterrupt)) {
                throw e;
            }
        }
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

export function resync<F extends (...params: any)=> any>(fn: F, { limit = 100 } = {}):
        (...params: Parameters<F>) => Promise<ReturnType<F>> {

    async function runEvaluation(state: ExecutionState,
            ...params: Parameters<F>): Promise<ReturnType<F>> {

        try {
            queue = [...state.queue];
            debug(`starting execution with ${queue.length} results: ` + queue.map(v => v.toString()).join(', '));
            const value = fn(...params as any);
            if(queue.length) {
                throw new Error('Resync evaluation differed between runs, make sure impure functions are called inside state()');
            }
            return value;
        } catch(e) {
            if(!(e instanceof AsyncInterrupt)) {
                throw e;
            }

            await state.updateQueue(e.promise, limit);
            return await runEvaluation(state, ...params as any);
        }
    }

    return async (...params) => await runEvaluation(new ExecutionState(), ...params);
}
