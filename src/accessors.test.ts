import * as fns from './accessors';

describe('accessors', () => {
    describe('_prop', () => {
        const foo = Symbol();
        it.each([
            ['hi', { hi: 1 }, 1, true],
            ['hi', { no: 1 }, NaN, false],
            ['hi', null, NaN, false],
            [foo, new Map<any, any>([[foo, 'bar']]), 'bar', true],
            ['nope', new Map<any, any>([[foo, 'bar']]), NaN, false],
            [foo, { [foo]: 'bar' }, 'bar', true],
        ])('_prop(fn, %p)(%p) -> fn(%p) -> %p', (key, obj, arg, expectCall) => {
            const sentinel = {};
            let called = false;
            const cb = (v: any) => {
                called = true;
                expect(v).toBe(arg);
                return sentinel;
            };
            const p = fns._prop(key)(cb);
            const ret = p(obj);
            if (expectCall) {
                expect(ret).toBe(sentinel);
            } else {
                expect(ret).toBe(false);
            }
            expect(called).toBe(expectCall);
        });
    });
    describe('_index', () => {
        it.each([
            [0, ['hi'], 'hi', true],
            [2, [0, 1, 2, 3], 2, true],
            [0.2, ['hi'], NaN, false],
            [-1, ['hi'], NaN, false],
            [1000, ['hi'], NaN, false],
            [Infinity, ['hi'], NaN, false],
            [NaN, ['hi'], NaN, false],
            [0, {}, NaN, false],
        ])('_index(fn, %p)(%p) -> fn(%p) -> %p', (idx, arr, arg, expectCall) => {
            const sentinel = {};
            let called = false;
            const cb = (v: any) => {
                called = true;
                expect(v).toBe(arg);
                return sentinel;
            };
            const p = fns._index(idx)(cb);
            const ret = p(<any>arr);
            if (expectCall) {
                expect(ret).toBe(sentinel);
            } else {
                expect(ret).toBe(false);
            }
            expect(called).toBe(expectCall);
        });
    });
    describe('_some', () => {
        it.each([
            [[1, 2, 3], [1], true, (v: number) => v >= 1],
            [[1, 2, 3], [1, 2, 3], true, (v: number) => v >= 3],
            [[1, 2, 3], [1, 2, 3], false, (v: number) => v >= 4],
            [null, [], false, () => {}],
            [{}, [], false, () => {}],
            [new Set([1, 2, 3]), [1], true, (v: number) => v >= 1],
            ['abc', ['a'], true, (v: any) => true],
            [
                new Map([
                    ['a', 1],
                    ['b', 2],
                    ['c', 3],
                ]),
                [1],
                true,
                (v: number) => v >= 1,
            ],
        ])('_some(fn)(%p) -> fn(%p) -> %p :: %s', (arr, args, expected, fn) => {
            const calls: any[] = [];
            const cb = (v: any) => {
                calls.push(v);
                return fn(v);
            };
            const p = fns._some(cb);
            const ret = p(<any>arr);
            expect(calls).toEqual(args);
            expect(expected).toBe(ret);
        });
        it('rethrows an unexpected error', () => {
            // in case the user passes something strange or unexpected, ensure we
            // don't swallow the error... at least if it's not a TypeError
            expect(() => {
                fns._every(() => false)({
                    [Symbol.iterator]: () => {
                        throw new Error('foo');
                    },
                });
            }).toThrow('foo');
        });
    });
    describe('_every', () => {
        it.each([
            [[1, 2, 3], [1, 2, 3], true, (v: number) => v >= 1],
            [[1, 2, 3], [1], false, (v: number) => v >= 3],
            [[1, 2, 3], [1], false, (v: number) => v >= 4],
            [null, [], false, () => {}],
            [{}, [], false, () => {}],
            [new Set([1, 2, 3]), [1], false, (v: number) => v >= 4],
            ['abc', ['a'], false, (v: any) => false],
            [
                new Map([
                    ['a', 1],
                    ['b', 2],
                    ['c', 3],
                ]),
                [1],
                false,
                (v: number) => v >= 4,
            ],
        ])('_every(fn)(%p) -> fn(%p) -> %p :: %s', (arr, args, expected, fn) => {
            const calls: any[] = [];
            const cb = (v: any) => {
                calls.push(v);
                return fn(<any>v);
            };
            const p = fns._every(cb);
            const ret = p(<any>arr);
            expect(calls).toEqual(args);
            expect(expected).toBe(ret);
        });
        it('rethrows an unexpected error', () => {
            // in case the user passes something strange or unexpected, ensure we
            // don't swallow the error... at least if it's not a TypeError
            expect(() => {
                fns._every(() => false)({
                    [Symbol.iterator]: () => {
                        throw new Error('foo');
                    },
                });
            }).toThrow('foo');
        });
    });
});
