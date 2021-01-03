import * as fns from './predicates';

// writing these tests is mostly useless, but i guess it verifies
// that there aren't any strangenesses, like flipping an operator
describe('predicates', () => {
    describe('_looseEq', () => {
        it.each([
            [1, '1', true],
            [1, 1, true],
            [1, '2', false],
            [1, 2, false],
        ])('%p == %p -> %p', (v1, v2, expected) => {
            expect(fns._looseEq(v1)(v2)).toBe(expected);
        });
    });
    describe('_strictEq', () => {
        const obj = {};
        it.each([
            [1, '1', false],
            [1, 1, true],
            ['1', '1', true],
            [1, 2, false],
            [1, '2', false],
            [obj, obj, true],
            [obj, {}, false],
        ])('%p === %p -> %p', (v1, v2, expected) => {
            expect(fns._strictEq(v1)(v2)).toBe(expected);
        });
    });
    describe('_ciEq', () => {
        const obj = {};
        it.each([
            ['foo', 'fOo', true],
            ['foo', 'afoo', false],
        ])('%p === %p -> %p', (v1, v2, expected) => {
            expect(fns._ciEq(v1)(v2)).toBe(expected);
        });
    });
    describe('_gt', () => {
        it.each([
            [3, 4, true],
            [3, 3, false],
            [3, 2, false],
            [new Date(3), new Date(4), true],
            [new Date(3), new Date(3), false],
            [new Date(3), new Date(2), false],
        ])('%p > %p -> %p', (v1, v2, expected) => {
            expect(fns._gt(v1)(v2)).toBe(expected);
        });
    });
    describe('_gte', () => {
        it.each([
            [3, 4, true],
            [3, 3, true],
            [3, 2, false],
            [new Date(3), new Date(4), true],
            [new Date(3), new Date(3), true],
            [new Date(3), new Date(2), false],
        ])('%p >= %p -> %p', (v1, v2, expected) => {
            expect(fns._gte(v1)(v2)).toBe(expected);
        });
    });
    describe('_lt', () => {
        it.each([
            [3, 4, false],
            [3, 3, false],
            [3, 2, true],
            [new Date(3), new Date(4), false],
            [new Date(3), new Date(3), false],
            [new Date(3), new Date(2), true],
        ])('%p < %p -> %p', (v1, v2, expected) => {
            expect(fns._lt(v1)(v2)).toBe(expected);
        });
    });
    describe('_lte', () => {
        it.each([
            [3, 4, false],
            [3, 3, true],
            [3, 2, true],
            [new Date(3), new Date(4), false],
            [new Date(3), new Date(3), true],
            [new Date(3), new Date(2), true],
        ])('%p <= %p -> %p', (v1, v2, expected) => {
            expect(fns._lte(v1)(v2)).toBe(expected);
        });
    });
    describe('_rex', () => {
        it.each([
            [/foo/, 'afooe', true],
            [/foo/, 'abare', false],
        ])('%p.test(%p) -> %p', (re, str, expected) => {
            expect(fns._rex(re)(str)).toBe(expected);
        });
    });
    describe('_glob', () => {
        it.each([
            ['foo*baz', 'foo bar baz', true],
            ['foo*', 'bar baz', false],
            ['f.o*', 'foo', false],
            ['f.o*', 'f.o', true],
            ['foo*', 'afoob', false],
        ])('%p.test(%p) -> %p', (glob, str, expected) => {
            expect(fns._glob(glob)(str)).toBe(expected);
        });
    });
    describe('_in', () => {
        it.each([
            [new Set([1, 2, 3]), 1, true],
            [new Set([1, 2, 3]), 4, false],
        ])('%p.has(%p) -> %p', (set, v, expected) => {
            expect(fns._in(set)(v)).toBe(expected);
        });
    });
    describe('_null', () => {
        it.each([
            [null, true],
            [undefined, false],
            [0, false],
        ])('%p is null -> %p', (v, expected) => {
            expect(fns._null()(v)).toBe(expected);
        });
    });
    describe('_undefined', () => {
        it.each([
            [null, false],
            [undefined, true],
            [0, false],
            [NaN, false],
        ])('%p is undefined -> %p', (v, expected) => {
            expect(fns._undefined()(v)).toBe(expected);
        });
    });
    describe('_nullish', () => {
        it.each([
            [null, true],
            [undefined, true],
            [0, false],
            [NaN, false],
        ])('%p is nullish -> %p', (v, expected) => {
            expect(fns._nullish()(v)).toBe(expected);
        });
    });
    describe('_true', () => {
        it.each([
            [true, true],
            [false, false],
            [1, false],
        ])('%p is true -> %p', (v, expected) => {
            expect(fns._true()(v)).toBe(expected);
        });
    });
    describe('_false', () => {
        it.each([
            [true, false],
            [false, true],
            [0, false],
        ])('%p is false -> %p', (v, expected) => {
            expect(fns._false()(v)).toBe(expected);
        });
    });
    describe('_truthy', () => {
        it.each([
            [true, true],
            [false, false],
            [1, true],
            [0, false],
            ['hi', true],
            ['', false],
        ])('%p is truthy -> %p', (v, expected) => {
            expect(fns._truthy()(v)).toBe(expected);
        });
    });
    describe('_falsy', () => {
        it.each([
            [true, false],
            [false, true],
            [1, false],
            [0, true],
            ['hi', false],
            ['', true],
        ])('%p is y -> %p', (v, expected) => {
            expect(fns._falsy()(v)).toBe(expected);
        });
    });
    describe('_not', () => {
        it.each([
            [() => true, false],
            [() => false, true],
        ])('!%s -> %p', (v, expected) => {
            expect(fns._not(v)(null)).toBe(expected);
        });
    });
    describe('_and', () => {
        it.each([
            [() => true, () => true, true],
            [() => true, () => false, false],
            [() => false, () => true, false],
            [() => false, () => false, false],
        ])('_and(%s, %s) -> %p', (lhs, rhs, expected) => {
            expect(fns._and(lhs, rhs)(null)).toBe(expected);
        });
        it('short circuits', () => {
            let n = 0;
            fns._and(
                () => {
                    n++;
                    return false;
                },
                () => {
                    n++;
                    return true;
                }
            )(null);
            expect(n).toBe(2);
            fns._and(
                () => {
                    n++;
                    return true;
                },
                () => {
                    n++;
                    return false;
                }
            )(null);
            expect(n).toBe(3);
        });
    });
    describe('_or', () => {
        it.each([
            [() => true, () => true, true],
            [() => true, () => false, true],
            [() => false, () => true, true],
            [() => false, () => false, false],
        ])('_or(%s, %s) -> %p', (lhs, rhs, expected) => {
            expect(fns._or(lhs, rhs)(null)).toBe(expected);
        });
        it('short circuits', () => {
            let n = 0;
            fns._or(
                () => {
                    n++;
                    return false;
                },
                () => {
                    n++;
                    return true;
                }
            )(null);
            expect(n).toBe(1);
            fns._or(
                () => {
                    n++;
                    return true;
                },
                () => {
                    n++;
                    return false;
                }
            )(null);
            expect(n).toBe(3);
        });
    });
    describe('_string', () => {
        it.each([
            ['hi', true, true],
            ['hi', false, false],
            [0, true, false],
        ])('_string(%p)(%p) -> %p', (val, cval, expected) => {
            let n = 0;
            const res = fns._string((t: string): boolean => {
                n++;
                return cval;
            })(val);
            if (expected) {
                expect(n).toBe(1);
            }
            expect(res).toBe(expected);
        });
    });
    describe('_number', () => {
        it.each([
            [12, true, true],
            [12, false, false],
            ['hi', true, false],
            [NaN, true, false],
            [new Date(), true, false],
        ])('_string(%p)(%p) -> %p', (val, cval, expected) => {
            let n = 0;
            const res = fns._number((t: number): boolean => {
                n++;
                return cval;
            })(val);
            if (expected) {
                expect(n).toBe(1);
            }
            expect(res).toBe(expected);
        });
    });
    describe('_date', () => {
        it.each([
            [12, true, false],
            [12, false, false],
            ['hi', true, false],
            [NaN, true, false],
            [new Date(), true, true],
            [new Date(), false, false],
        ])('_string(%p)(%p) -> %p', (val, cval, expected) => {
            let n = 0;
            const res = fns._date((t: Date): boolean => {
                n++;
                return cval;
            })(val);
            if (expected) {
                expect(n).toBe(1);
            }
            expect(res).toBe(expected);
        });
    });
    describe('_instanceof', () => {
        it.each([
            [Buffer.from([]), Buffer, true, true],
            [Buffer.from([]), Buffer, false, false],
            [12, Buffer, true, false],
        ])('_string(%p)(%p) -> %p', (val, Ctor, cval, expected) => {
            let n = 0;
            const res = fns._instanceof(Ctor, (t: any): boolean => {
                n++;
                return cval;
            })(val);
            if (expected) {
                expect(n).toBe(1);
            }
            expect(res).toBe(expected);
        });
    });
    describe('_range', () => {
        it.each([
            [-Infinity, false, Infinity, false, 0, true],
            [Infinity, true, -Infinity, true, 0, false],
            [1, true, 3, true, 0, false],
            [1, true, 3, true, 1, true],
            [1, true, 3, true, 2, true],
            [1, true, 3, true, 3, true],
            [1, true, 3, true, 4, false],
            [1, false, 3, true, 0, false],
            [1, false, 3, true, 1, false],
            [1, false, 3, true, 2, true],
            [1, false, 3, true, 3, true],
            [1, false, 3, true, 4, false],
            [1, true, 3, false, 0, false],
            [1, true, 3, false, 1, true],
            [1, true, 3, false, 2, true],
            [1, true, 3, false, 3, false],
            [1, true, 3, false, 4, false],
            [1, false, 3, false, 0, false],
            [1, false, 3, false, 1, false],
            [1, false, 3, false, 2, true],
            [1, false, 3, false, 3, false],
            [1, false, 3, false, 4, false],
            [new Date(1), true, new Date(3), true, new Date(0), false],
            [new Date(1), true, new Date(3), true, new Date(1), true],
            [new Date(1), true, new Date(3), true, new Date(2), true],
            [new Date(1), true, new Date(3), true, new Date(3), true],
            [new Date(1), true, new Date(3), true, new Date(4), false],
            [new Date(1), false, new Date(3), true, new Date(0), false],
            [new Date(1), false, new Date(3), true, new Date(1), false],
            [new Date(1), false, new Date(3), true, new Date(2), true],
            [new Date(1), false, new Date(3), true, new Date(3), true],
            [new Date(1), false, new Date(3), true, new Date(4), false],
            [new Date(1), true, new Date(3), false, new Date(0), false],
            [new Date(1), true, new Date(3), false, new Date(1), true],
            [new Date(1), true, new Date(3), false, new Date(2), true],
            [new Date(1), true, new Date(3), false, new Date(3), false],
            [new Date(1), true, new Date(3), false, new Date(4), false],
            [new Date(1), false, new Date(3), false, new Date(0), false],
            [new Date(1), false, new Date(3), false, new Date(1), false],
            [new Date(1), false, new Date(3), false, new Date(2), true],
            [new Date(1), false, new Date(3), false, new Date(3), false],
            [new Date(1), false, new Date(3), false, new Date(4), false],
        ])(
            '_range(%p, %p, %p, %p)(%p) -> %p',
            (lower, lowerInclusive, upper, upperInclusive, val, expected) => {
                expect(fns._range(lower, lowerInclusive, upper, upperInclusive)(val)).toBe(
                    expected
                );
            }
        );
    });
    // might as well get 100% coverage..
    describe('strToRegex', () => {
        const strToRegex = fns._testable.strToRegex;
        it('escapes characters', () => {
            expect(
                strToRegex('~!@#$%^&*(){}`/=?+|\',."<>-_', '').test('~!@#$%^&*(){}`/=?+|\',."<>-_')
            ).toBe(true);
        });
    });
});
