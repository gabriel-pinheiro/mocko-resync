import { Execution, FailureExecution, SuccessExecution, UnknownExecution } from "./execution";
import { AsyncInterrupt } from "./interrupt";

export class ExecutionState {
    public readonly queue: Execution<unknown>[] = [];
    private retries = 0;

    async updateQueue(promise: Promise<unknown>, limit: number): Promise<void> {
        if(this.retries > limit) {
            throw new Error('Too many resynchronizations, limit: ' + limit);
        }

        this.retries++;
        const queueDeepness = this.queue.filter(e => e instanceof UnknownExecution).length;
        const [deepness, execution] = await this.updateInstructions(promise);
        
        this.mergeInstructionsToQueue(queueDeepness, deepness, execution);
    }

    private async updateInstructions(promise: Promise<unknown>,
            deepness = 0): Promise<[number, Execution<unknown>]> {
        try {
            const value = await promise;
            return [deepness, new SuccessExecution(value)];
        } catch(e) {
            if(e instanceof AsyncInterrupt) {
                return await this.updateInstructions(e.promise, deepness + 1);
            } else {
                return [deepness, new FailureExecution(e)];
            }
        }
    }

    private mergeInstructionsToQueue(queueDeepness: number,
            deepness: number, execution: Execution<unknown>): void {
        
        if(queueDeepness <= deepness) {
            const unks = new Array(deepness - queueDeepness)
                .fill(new UnknownExecution());
            this.queue.push(...unks);
        } else {
            for(let diff = queueDeepness - deepness; diff > 0; diff--) {
                let exec: Execution<unknown>;
                do {
                    exec = this.queue.pop();
                    if(typeof exec === 'undefined') {
                        throw new Error('Undefined execution');
                    }
                } while(!(exec instanceof UnknownExecution));
            }
        }

        this.queue.push(execution);
    }
}
