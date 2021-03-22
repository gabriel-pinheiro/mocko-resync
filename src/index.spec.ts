import { resync, wait, affect, state, except } from "./index";

const sleepValue = <T>(millis: number, value?: T): Promise<T> => new Promise(r => setTimeout(() => r(value), millis));
const sleepError = (millis: number, error: Error) => new Promise((_, r) => setTimeout(() => r(error), millis));

describe('wait', () => {
    it('should return the promise resolved value', async () => {
        expect.assertions(2);
        await resync(() => {
            let value = wait(() => sleepValue(10, 7));
            affect(() => expect(value).toEqual(7));
            value = wait(() => sleepValue(10, 13));
            affect(() => expect(value).toEqual(13));
        })();
    });

    it('should throw the promise rejected value', async () => {
        await resync(() => {
            try {
                wait(() => sleepError(10, new Error("Foo")));
                fail('it should not reach here')
            } catch(e) {
                except(e);
                wait(() => sleepValue(10));
            }
        })();
    });

    it('should not lose context', async () => {
        expect.assertions(1);
        await resync(function() {
            this.foo = 'bar';
            wait(() => sleepValue(10));
            expect(this.foo).toEqual('bar');
        }).call({});
    });
});

describe('resync', () => {
    it('should return', async () => {
        const val = await resync(() => {
            return wait(() => sleepValue(10, 7));
        })();

        expect(val).toEqual(7);
    });

    it('should throw', async () => {
        expect.assertions(1);
        await resync(() => {
            return wait(() => sleepError(10, new Error('error')));
        })().catch(e => expect(e).toBeInstanceOf(Error));
    });

    it('should pass context', async () => {
        expect.assertions(1);
        await resync(function() {
            expect(this.foo).toEqual('bar');
        }).call({foo: 'bar'});
    });

    it('should run in parallel', async () => {
        const sum = resync((a: number, b: number) => {
            const futureA = wait(() => sleepValue(10, a));
            const futureB = wait(() => sleepValue(10, b));

            return wait(() => sleepValue(10, futureA + futureB));
        });

        const [x, y] = await Promise.all([sum(3, 5), sum(13, 7)]);
        expect(x).toEqual(8);
        expect(y).toEqual(20);
    });
});

describe('state', () => {
    it('should run stateful methods once and only once', async () => {
        let executions = 0;

        await resync(() => {
            wait(() => sleepValue(10));
            affect(() => executions++);
            wait(() => sleepValue(10));
            wait(() => sleepValue(10));
        })();

        expect(executions).toEqual(1);
    });
    it('should always return stateful value', async () => {
        await resync(() => {
            const val = state(() => 7);
            expect(val).toEqual(7);
            wait(() => sleepValue(10));
        })();
    });
    it('should always throw stateful value', async () => {
        await resync(() => {
            try {
                state(() => { throw new Error("Foo"); });
                fail('it should not reach here')
            } catch(e) {
                except(e);
                wait(() => sleepValue(10));
            }
        })();
    });

    it('should support being nested', async () => {
        const noop = () => {};

        const val = await resync(() => {
            affect(noop);
            affect(noop);
            const one = state(() => 1);
            const two = state(() => 2);
            const four = state(() => {
                affect(noop);
                return state(() => 4);
            });
            const eight = state(() => state(() => state(() => 8)));
            const sixteen = 16;

            return one + two + four + eight + sixteen;
        })();

        expect(val).toEqual(31);
    });
});

describe('except', () => {
    it('should rethrow interrupts', () => {
        expect(() => {
            try {
                state(() => null);
            } catch(e) {
                except(e);
            }
        }).toThrow();
    });
    it('should not affect exceptions', () => {
        try {
            throw new Error();
        } catch(e) {
            except(e);
        }
    });
});
