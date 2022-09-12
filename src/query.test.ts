import { inspect } from 'util';
import sinon from 'sinon';
import { parse, ParseError, _testable as qTestable } from './query';
import * as _ from './predicates';
import { VALUE } from './accessors';
import { Predicate } from './predicates';

type Op = string;
type Val = string;
type Match = any;
type Fail = any;

type TestPrimitive = [Op, Val, Match, Fail];

const numbers = ['1', '1.5', '1e+2', '-1', '-1.5', '1e-2'];
const numericComparisons: [string, Function][] = [
    ['=', _._strictEq],
    ['<', _._lt],
    ['<=', _._lte],
    ['>', _._gt],
    ['>=', _._gte],
];
const numericClauses: TestPrimitive[] = [];
// somewhat exhaustively verify that all expected numerically-relevant
// comparisons accept numeric values
for (const [cmp, fn] of numericComparisons) {
    for (const nStr of numbers) {
        const n = parseFloat(nStr);
        const candidates = [n, n - 1, n + 1];
        const f = fn(n);
        const yes = candidates.find((v) => f(v));
        const no = candidates.find((v) => !f(v));
        numericClauses.push([cmp, nStr, yes, no]);
    }
}

numericClauses.push(
    // test recognition in numeric comparisons, negative values, and round argument
    ['<', '-2.5d@h', qTestable.relOffset(-5, 'd'), new Date()],
    // test recognition in range clauses, explicit positive values, absence of round argument
    ['in range', '[-1h, +1h]', qTestable.relOffset(0, 's'), qTestable.relOffset(5, 'd')]
);

// ranges -- test inclusive and exclusive properties
for (const nStr of numbers) {
    const n = parseFloat(nStr);
    const mid = n * 2;
    const n2 = n * 3;
    const high = Math.max(n, n2);
    const low = Math.min(n, n2);
    numericClauses.push(['range', `[${low}, ${high}]`, mid, low - 1]);
    numericClauses.push(['range', `[${low}, ${high}]`, low, high + 1]);
    numericClauses.push(['range', `[${low}, ${high}]`, high, low - 1]);
    numericClauses.push(['range', `(${low}, ${high})`, mid, high]);
    numericClauses.push(['range', `(${low}, ${high})`, mid, low]);
}

// other operators -- check that they parse and evaluate correctly
const clauses: TestPrimitive[] = numericClauses.concat([
    // strings
    ['=', '"foo"', 'fOo', 'bar'],
    ['=', '"fo\\eo"', 'foeo', 'fo\\eo'],
    ['=', "'foo'", 'fOo', 'bar'],
    ['=', "'f\\'oo'", "f'oo", "f\\'oo"],
    ['=', '"f.o*"', 'f.Oeu', 'afoo'],
    ['=', 'foo', 'foo', 'bar'],
    ['==', '"foo"', 'foo', 'fOo'],
    ['==', "'foo'", 'foo', 'fOo'],
    ['==', '"foo*"', 'fooe', 'f.Oeu'],
    ['~=', '/foo/i', 'FOO', 'bar'],
    ['~=', '/foo/', 'foo', 'FOO'],
    // membership
    ['in', '(1)', 1, 'foo'],
    ['in', '(1, "hi")', 'hi', 3],
    // keywords
    ['=', 'true', true, false],
    ['=', 'false', false, true],
    ['=', 'null', null, undefined],
    ['=', 'undefined', undefined, null],
]);

const testcases: any[][] = [];
const negatable = new Set(['range', 'in']);
// transform our test case data into the format expected by it.each
for (let [op, val, match, fail] of clauses) {
    // verify that everything parses when negatable in various ways
    for (let [pre, tval, fval] of [
        ['', true, false],
        ['not ', false, true],
    ]) {
        // valid property, fails condition
        testcases.push([`${pre}foo ${op} ${val}`, { foo: match }, tval]);
        // valid property, passes condition
        testcases.push([`${pre}foo ${op} ${val}`, { foo: fail }, fval]);
        // all `=` can be `!=`
        if (op === '=') {
            testcases.push([`${pre}foo != ${val}`, { foo: match }, fval]);
            testcases.push([`${pre}foo != ${val}`, { foo: fail }, tval]);
        }
        // regex negation is special
        if (op === '~=') {
            testcases.push([`${pre}foo ~! ${val}`, { foo: match }, fval]);
            testcases.push([`${pre}foo ~! ${val}`, { foo: fail }, tval]);
        }
        // negatable keywords
        if (negatable.has(op)) {
            testcases.push([`${pre}foo not ${op} ${val}`, { foo: match }, fval]);
            testcases.push([`${pre}foo not ${op} ${val}`, { foo: fail }, tval]);
        }
        // property doesn't exist
        testcases.push([`${pre}foo ${op} ${val}`, {}, fval]);
    }
}

function reportErrors(query: string, obj: any, expected: boolean) {
    try {
        const actual = parse(query)(obj);
        if (actual !== expected) {
            console.error(
                'Expected `' +
                    query +
                    '` ' +
                    (!expected ? 'not ' : '') +
                    'to match `' +
                    inspect(obj, { depth: null, colors: true, breakLength: Infinity }) +
                    '`'
            );
            console.log('function stack:', parse(query, true));
            throw new Error(
                'Unexpected match result, got=' +
                    actual +
                    ', expected=' +
                    expected +
                    ', q=`' +
                    query +
                    '`, v=`' +
                    obj.foo +
                    '`, fn=' +
                    parse(query, true)
            );
        }
    } catch (err) {
        if (err instanceof ParseError) {
            if (err.lexerErrors) {
                console.log('Lexer errors:');
                for (let e of err.lexerErrors) {
                    console.log(e.message.replace('\n', ' '));
                }
            }
            if (err.parseErrors) {
                console.log('Parse errors:');
                for (let e of err.parseErrors) {
                    console.log(e.message.replace('\n', ' '));
                }
            }
            throw new Error('lex/parse errors encountered, q=`' + query + '`, v=`' + obj.foo + '`');
        }
        throw err;
    }
}

describe('cloneRegexWithY', () => {
    it('adds the `y` flag', () => {
        const re = qTestable.cloneRegexWithY(/foo/);
        expect(re.flags).toContain('y');
    });
    it('keeps the `y` flag if present', () => {
        const re = qTestable.cloneRegexWithY(/foo/y);
        expect(re.flags).toContain('y');
    });
    it('strips the `g` flag', () => {
        const re = qTestable.cloneRegexWithY(/foo/g);
        expect(re.flags).not.toContain('g');
    });
});

describe('relOffset', () => {
    let clock: sinon.SinonFakeTimers;
    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });
    it.each([
        ['s', 1000],
        ['m', 60 * 1000],
        ['h', 3600 * 1000],
        ['d', 86400 * 1000],
    ])('offsets by -1%p', (unit, ms) => {
        const fixed = 86400 * 2;
        clock.tick(fixed);
        expect(+qTestable.relOffset(-1, unit)).toBe(fixed - ms);
    });
    it.each([
        ['s', 86400 + 3600 + 60 + 1],
        ['m', 86400 + 3600 + 60],
        ['h', 86400 + 3600],
        ['d', 86400],
    ])('rounds by %p', (unit, result) => {
        const fixed = (86400 + 3600 + 60 + 1) * 1000 + 1;
        clock.tick(fixed);
        expect(+qTestable.relOffset(0, 's', unit) / 1000).toBe(result);
    });
});

describe('parse errors', () => {
    it('throws a ParseError on invalid input', () => {
        expect(() => {
            parse('keke');
        }).toThrow(ParseError);
    });
});

describe('simple expressions', () => {
    it.each(testcases)('`%s` matches %p ? %p', (query, obj, expected) => {
        reportErrors(query, obj, expected);
    });
    it('renders strings in debug mode', () => {
        // also verifying: 1-character fields ok, and hitting all the debug paths
        const str = parse(
            'foo = "bar" and n range [1, 3] or lar in (1, 2, 3) and foo ~= /bar/ and t = true',
            true
        );
        expect(str).toMatchInlineSnapshot(
            `"_or( _and( _and( _prop("t")(_custom(_true())), _prop("foo")(_custom(_rex(/bar/))) ), _prop("lar")(_custom(_in([1,2,3]))) ), _and( _prop("n")(_custom(_range( 1, true, 3, true ))), _prop("foo")(_custom(_ciEq("bar"))) ) )"`
        );
    });
});

// these are reproduced in shuntingyard.test.js, but here
// we're ensuring that the parser uses shuntingyard correctly
// by verifying the outcome of a parsed query; there, we're
// just verifying that the class behaves correctly
describe('boolean expressions', () => {
    it('applies correct precedence (1)', () => {
        // prettier-ignore
        const expected = true || false && false || false;
        const actual = parse('foo=1 or foo=2 and foo=2 or foo=2')({ foo: 1 });
        expect(actual).toBe(expected);
    });
    it('applies correct precedence (2)', () => {
        const expected = (true || false) && (false || false);
        const actual = parse('(foo=1 or foo=2) and (foo=2 or foo=2)')({ foo: 1 });
        expect(actual).toBe(expected);
    });
    it('supports implicit and', () => {
        expect(parse('foo=1 bar=2')({ foo: 1, bar: 2 })).toBe(true);
        expect(parse('foo=1 bar=2')({ foo: 2, bar: 2 })).toBe(false);
        expect(parse('foo=1 bar=2')({ foo: 1, bar: 3 })).toBe(false);
        expect(parse('foo=1 bar=2')({ foo: 2, bar: 3 })).toBe(false);
    });
});

describe('accessors', () => {
    it.each([
        ['foo.bar=1', { foo: { bar: 1 } }, true],
        ['foo.bar=1', { foo: { bar: 0 } }, false],
        ['foo.bar=1', { foo: null }, false],
        ['foo[bar]=1', { foo: { bar: 1 } }, true],
        ['foo[bar]=1', { foo: { bar: 0 } }, false],
        ['foo[1]=1', { foo: [0, 1, 2] }, true],
        ['foo[1]=1', { foo: [0, 0, 0] }, false],
        ['foo[10]=1', { foo: [0, 1, 2] }, false],
        ['foo[]=1', { foo: [0, 1, 2] }, true],
        ['foo[]=1', { foo: [0, 0, 0] }, false],
        ['foo[]=1', { foo: null }, false],
        ['foo[].bar=1', { foo: [{ bar: 2 }, { bar: 1 }] }, true],
        ['foo[].bar=1', { foo: [{ bar: 2 }, { bar: 2 }] }, false],
        ['foo[*]=1', { foo: [1, 1, 1] }, true],
        ['foo[*]=1', { foo: [0, 1, 2] }, false],
        ['foo[*].bar=1', { foo: [{ bar: 1 }, { bar: 1 }] }, true],
        ['foo[*].bar=1', { foo: [{ bar: 1 }, { bar: 2 }] }, false],
    ])('%s, %p -> %p', (query, obj, expected) => {
        reportErrors(query, obj, expected);
    });
    it('supports custom accessor', () => {
        expect(
            parse('foo=1')({
                foo: {
                    [VALUE]: (p: Predicate) => p(1),
                },
            })
        ).toBe(true);
        expect(
            parse('foo=1')({
                foo: {
                    [VALUE]: (p: Predicate) => p(2),
                },
            })
        ).toBe(false);
    });
    it('rejects invalid index values', () => {
        expect(() => {
            parse('foo[-1]=1');
        }).toThrow('Failed to parse query');
    });
});
