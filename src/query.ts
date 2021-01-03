import {
    Lexer,
    EmbeddedActionsParser,
    createToken as _createToken,
    IRecognitionException,
    ILexingError,
} from 'chevrotain';
import type { TokenType, ITokenConfig } from 'chevrotain';
import { Predicate, _globCi } from './predicates';

export const _testable: { [key: string]: Function } = {};

// ----------------- Lexer -----------------
const allTokens: TokenType[] = [];
const charTokens = new Set();
const createToken = (opts: ITokenConfig, label?: string) => {
    const token = _createToken(opts);
    if (typeof label !== 'undefined') {
        token.LABEL = label;
    }
    if (typeof opts.pattern === 'string') {
        charTokens.add(opts.pattern);
    }
    allTokens.push(token);
    return token;
};

const cloneRegexWithY = (inRE: RegExp) => {
    let { source, flags } = inRE;
    // ensure the `y` flag is on, required for
    // matching from a specific position
    if (!flags.includes('y')) {
        flags += 'y';
    }
    // ensure the `g` flag is absent, required
    // for chevrotain tokens to behave correctly
    flags = flags.replace('g', '');
    return new RegExp(source, flags);
};
_testable.cloneRegexWithY = cloneRegexWithY;

const createCaptureToken = <T>(
    opts: ITokenConfig & { pattern: RegExp },
    map: (res: RegExpExecArray<T>) => T,
    label?: string
) => {
    const re = cloneRegexWithY(opts.pattern);
    return createToken(
        {
            name: opts.name,
            pattern: (text, startOffset) => {
                re.lastIndex = startOffset;

                const res: null | RegExpExecArray<T> = re.exec(text);
                if (res) {
                    res.payload = map(res);
                }
                return res;
            },
            line_breaks: false,
        },
        label
    );
};

// categories
const TextComparisonModifier = createToken({
    name: 'TextComparisonModifier',
    pattern: Lexer.NA,
});

const NumberComparisonModifier = createToken({
    name: 'NumberComparisonModifier',
    pattern: Lexer.NA,
});

const Infix = createToken({
    name: 'Infix',
    pattern: Lexer.NA,
});

const Value = createToken({
    name: 'Value',
    pattern: Lexer.NA,
});

// character sequences
const RegexpLiteral = createToken({
    name: 'RegexpLiteral',
    pattern: /\/(?:[^/\[\\]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[imgu]*/,
});
const NumberLiteral = createCaptureToken(
    {
        name: 'NumberLiteral',
        pattern: /[+-]?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
    },
    ([v]) => parseFloat(v)
);
const unescape = (() => {
    const re = /\\./g;
    const cb = (v: string): string => v[1];
    return (v: string): string => v.replace(re, cb);
})();
const DoubleQuoted = createCaptureToken<string>(
    {
        name: 'DoubleQuoted',
        pattern: /"((?:[^\\"]+|\\.)*)"/,
    },
    ([_, v]) => unescape(v)
);
const SingleQuoted = createCaptureToken<string>(
    {
        name: 'SingleQuoted',
        pattern: /'((?:[^\\']+|\\.)*)'/,
    },
    ([_, v]) => unescape(v)
);

// identifiers
const Field = createToken({ name: 'Field', pattern: /[A-Za-z]\w*/ });

declare interface RegExpExecArray<T> extends globalThis.RegExpExecArray {
    payload?: T;
}

const RelTime = createCaptureToken<{ unit: string; round?: string }>(
    {
        name: 'RelTime',
        pattern: /(?<=\d)([smhd])(?:@([smhd]))?/,
        longer_alt: Field,
    },
    ([_, unit, round]) => ({ unit, round })
);

// query keywords
const AND = createToken({
    name: 'AND',
    pattern: /AND/i,
    longer_alt: Field,
    categories: [Infix],
});
const OR = createToken({
    name: 'OR',
    pattern: /OR/i,
    longer_alt: Field,
    categories: [Infix],
});
const NOT = createToken({
    name: 'NOT',
    pattern: /NOT/i,
    longer_alt: Field,
    categories: [],
});

const IN = createToken({
    name: 'IN',
    pattern: /IN/i,
    longer_alt: Field,
    categories: [],
});

const RANGE = createToken({
    name: 'RANGE',
    pattern: /RANGE/i,
    longer_alt: Field,
    categories: [],
});

// value keywords
const True = createCaptureToken<boolean>(
    {
        name: 'True',
        pattern: /true/i,
        longer_alt: Field,
        categories: [Value],
    },
    ([v]) => JSON.parse(v)
);
const False = createCaptureToken<boolean>(
    {
        name: 'False',
        pattern: /false/i,
        longer_alt: Field,
        categories: [Value],
    },
    ([v]) => JSON.parse(v)
);
const Null = createCaptureToken<null>(
    {
        name: 'Null',
        pattern: /null/i,
        longer_alt: Field,
        categories: [Value],
    },
    ([v]) => JSON.parse(v)
);
const Undefined = createCaptureToken<undefined>(
    {
        name: 'Undefined',
        pattern: /undefined/i,
        longer_alt: Field,
        categories: [Value],
    },
    () => undefined
);

// tokens
//const LCurly = createToken({name: "LCurly", pattern: "{"}, "{");
//const RCurly = createToken({name: "RCurly", pattern: "}"}, "}");
const LSquare = createToken({ name: 'LSquare', pattern: '[' }, '[');
const RSquare = createToken({ name: 'RSquare', pattern: ']' }, ']');
const LParen = createToken({ name: 'LParen', pattern: '(' }, '(');
const RParen = createToken({ name: 'RParen', pattern: ')' }, ')');
const Comma = createToken({ name: 'Comma', pattern: ',' }, ',');
const Period = createToken({ name: 'Period', pattern: '.' }, '.');
//const Backslash = createToken({name: "Backslash", pattern: "\\"}, "\\");
const Equal = createToken(
    {
        name: 'Equal',
        pattern: '=',
    },
    '='
);
const Tilde = createToken(
    {
        name: 'Tilde',
        pattern: '~',
        categories: [TextComparisonModifier],
    },
    '~'
);
const Exclaim = createToken(
    {
        name: 'Exclaim',
        pattern: '!',
        categories: [TextComparisonModifier, NumberComparisonModifier],
    },
    '!'
);
const Less = createToken(
    {
        name: 'Less',
        pattern: '<',
        categories: [NumberComparisonModifier],
    },
    '<'
);
const Greater = createToken(
    {
        name: 'Greater',
        pattern: '>',
        categories: [NumberComparisonModifier],
    },
    '>'
);
const Asterisk = createToken({ name: 'Asterisk', pattern: '*' }, '*');
//const SQuote = createToken({name: "SQuote", pattern: "'"}, "'");
//const DQuote = createToken({name: "DQuote", pattern: '"'}, '"');

// whitespace
const Whitespace = createToken({
    name: 'Whitespace',
    pattern: /\s+/,
    group: Lexer.SKIPPED,
});

const lexer = new Lexer(allTokens.reverse());

// ----------------- parser -----------------
import {
    _strictEq,
    _gt,
    _gte,
    _lt,
    _lte,
    _rex,
    _glob,
    _in,
    _null,
    _undefined,
    _true,
    _false,
    _truthy,
    _falsy,
    _not,
    _and,
    _or,
    _range,
    _ciEq,
} from './predicates';

import { _custom, _every, _index, _prop, _some } from './accessors';
import { ShuntingYard } from './shuntingyard';

const unitFns = {
    s: (d: Date, v: number) => d.setUTCSeconds(d.getUTCSeconds() + v),
    m: (d: Date, v: number) => d.setUTCMinutes(d.getUTCMinutes() + v),
    h: (d: Date, v: number) => d.setUTCHours(d.getUTCHours() + v),
    d: (d: Date, v: number) => d.setUTCDate(d.getUTCDate() + v),
};
const roundFns = {
    s: (d: Date) => d.setUTCMilliseconds(0),
    m: (d: Date) => d.setUTCSeconds(0, 0),
    h: (d: Date) => d.setUTCMinutes(0, 0, 0),
    d: (d: Date) => d.setUTCHours(0, 0, 0, 0),
};

type RelUnit = keyof typeof unitFns & keyof typeof roundFns;

const relOffset = (offset: number, unit: RelUnit, round?: RelUnit): Date => {
    const d = new Date();
    unitFns[unit](d, offset);
    round && roundFns[round](d);
    return d;
};
_testable.relOffset = relOffset;

const notGlob = /^(?:[^\\\*]+|\\[\\\*])*$/;

const stringify = (v: any) =>
    v instanceof RegExp
        ? v.toString()
        : v instanceof Set
        ? JSON.stringify([...v.values()])
        : JSON.stringify(v);

class QueryParser extends EmbeddedActionsParser {
    constructor() {
        super(allTokens);

        // very important to call this after all the rules have been setup.
        // otherwise the parser may not work correctly as it will lack information
        // derived from the self analysis.
        this.performSelfAnalysis();
    }

    public debug: boolean = false;

    // all the private d* functions essentially construct a string
    // when this.debug is true, rather than compose the functions
    private dV = (v: any): any => {
        if (this.debug) {
            return stringify(v);
        }
        return v;
    };
    private dN = (not: any, fn: Function): any => {
        if (not) {
            return this.d1(_not, fn);
        }
        return fn;
    };
    private d0 = (fn: Function): any => {
        if (this.debug) {
            return `${fn.name}()`;
        }
        return fn();
    };
    private d1 = (fn: Function, arg1: any): any => {
        if (this.debug) {
            return `${fn.name || fn}(${arg1})`;
        }
        return fn(arg1);
    };
    private d2 = (fn: Function, arg1: any, arg2: any): any => {
        if (this.debug) {
            return `${fn.name}( ${arg1}, ${arg2} )`;
        }
        return fn(arg1, arg2);
    };
    private d4 = (fn: Function, arg1: any, arg2: any, arg3: any, arg4: any): any => {
        if (this.debug) {
            return `${fn.name}( ${arg1}, ${arg2}, ${arg3}, ${arg4} )`;
        }
        return fn(arg1, arg2, arg3, arg4);
    };

    // entry point
    public parse = this.RULE('parse', () => {
        // reorder things to conform to and/or precedence
        const yard = new ShuntingYard(
            { AND, OR, LParen, RParen },
            { _and: this.d2.bind(this, _and), _or: this.d2.bind(this, _or) }
        );

        // we need at least one expression, but we don't expect
        // a boolean yet, so there is extra work in the 'many'
        // that isn't present for the first token
        const expr = this.SUBRULE(this.MaybeNegated);
        this.ACTION(() => yard.pushExpr(expr));

        this.MANY(() => {
            const bool = this.OPTION(() => this.CONSUME(Infix));
            const combinator = bool ? bool.tokenType : AND;

            const expr = this.SUBRULE2(this.MaybeNegated);
            this.ACTION(() => {
                yard.pushOp(combinator);
                yard.pushExpr(expr);
            });
        });

        return this.ACTION(() => yard.flush());
    });

    private MaybeNegated = this.RULE('MaybeNegated', () => {
        const not = !!this.OPTION(() => this.CONSUME(NOT));
        const expr = this.SUBRULE(this.ExpressionOrGroup);
        return this.ACTION(() => this.dN(not, expr));
    });

    private ExpressionOrGroup = this.RULE('ExpressionOrGroup', () =>
        this.OR([
            { ALT: () => this.SUBRULE(this.Expression) },
            { ALT: () => this.SUBRULE(this.Group) },
        ])
    );

    private Group = this.RULE('Group', () => {
        this.CONSUME(LParen);
        const expr = this.SUBRULE(this.parse);
        this.CONSUME(RParen);
        return expr;
    });

    private Expression = this.RULE('Expression', () => {
        const accessors = this.SUBRULE(this.ParseField);
        const predicate = this.OR([
            { ALT: () => this.SUBRULE(this.NumericExpression) },
            { ALT: () => this.SUBRULE(this.TextExpression) },
            { ALT: () => this.SUBRULE(this.InExpression) },
            { ALT: () => this.SUBRULE(this.RegexpExpression) },
            { ALT: () => this.SUBRULE(this.ValueExpression) },
            { ALT: () => this.SUBRULE(this.RangeExpression) },
        ]);

        // accessors are the (possibly nested) functions that delve through
        // a complex object to get to the thing we're comparing against.
        // predicates are the (possibly nested) functions that perform
        // the comparison. they are built opposite of each other:
        // accessors send their values to the next function call,
        // while predicates _return_ their values up the chain
        return this.ACTION(() => {
            return (
                accessors &&
                accessors.reduceRight((acc, cur) => this.d1(cur, acc), this.d1(_custom, predicate))
            );
        });
    });

    private ParseField = this.RULE('ParseField', () => {
        const accessors: any[] = [];
        const im = this.CONSUME(Field).image;
        accessors.push(this.d1(_prop, this.dV(im)));

        this.MANY(() => {
            const acc = this.OR([
                { ALT: () => this.SUBRULE(this.Indexed) },
                {
                    ALT: () => {
                        this.CONSUME(Period);
                        const im = this.CONSUME2(Field).image;
                        return this.ACTION(() => this.d1(_prop, this.dV(im)));
                    },
                },
            ]);
            this.ACTION(() => accessors.push(acc));
        });

        return this.ACTION(() => accessors);
    });

    private positiveInteger() {
        const v = this.LA(1).payload;
        return v >= 0 && Math.floor(v) === v;
    }

    private Indexed = this.RULE('Indexed', () => {
        this.CONSUME(LSquare);
        const alt = this.OPTION(() =>
            this.OR([
                { ALT: () => this.CONSUME(Asterisk) && _every },
                {
                    GATE: this.positiveInteger,
                    ALT: () => this.d1(_index, this.dV(this.CONSUME(NumberLiteral).payload)),
                },
                { ALT: () => this.d1(_prop, this.dV(this.SUBRULE(this.TextValue))) },
            ])
        );
        this.CONSUME(RSquare);
        return alt || _some;
    });

    private RangeExpression = this.RULE('RangeExpression', () => {
        const not = !!this.OPTION(() => this.CONSUME(NOT));
        this.OPTION2(() => this.CONSUME(IN));
        this.CONSUME(RANGE);
        const lhs = this.OR([
            { ALT: () => this.CONSUME(LParen).image },
            { ALT: () => this.CONSUME(LSquare).image },
        ]);
        const getV1 = this.SUBRULE(this.NumberOrRelTime);
        this.CONSUME(Comma);
        const getV2 = this.SUBRULE2(this.NumberOrRelTime);
        const rhs = this.OR2([
            { ALT: () => this.CONSUME(RParen).image },
            { ALT: () => this.CONSUME(RSquare).image },
        ]);
        return this.ACTION(() =>
            this.dN(
                not,
                getV1((lower) =>
                    getV2((upper) => this.d4(_range, lower, lhs === '[', upper, rhs === ']'))
                )
            )
        );
    });

    private InExpression = this.RULE('InExpression', () => {
        const set = new Set();
        const not = !!this.OPTION(() => this.CONSUME(NOT));
        this.CONSUME(IN);
        this.CONSUME(LParen);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => {
                set.add(
                    this.OR([
                        { ALT: () => this.SUBRULE(this.TextValue) },
                        { ALT: () => this.CONSUME(NumberLiteral).payload },
                        { ALT: () => this.CONSUME(Value).payload },
                    ])
                );
            },
        });
        this.CONSUME(RParen);
        return this.ACTION(() => this.dN(not, this.d1(_in, this.dV(set))));
    });

    private NumericExpression = this.RULE('NumericExpression', () => {
        const not = !!this.OPTION(() => this.CONSUME(Exclaim).image);
        const comparison = this.OR([
            { ALT: () => this.CONSUME1(Equal) && _strictEq },
            {
                ALT: () =>
                    this.CONSUME(Less) && this.OPTION2(() => this.CONSUME2(Equal)) ? _lte : _lt,
            },
            {
                ALT: () =>
                    this.CONSUME(Greater) && this.OPTION3(() => this.CONSUME3(Equal)) ? _gte : _gt,
            },
        ]);
        const getV = this.SUBRULE(this.NumberOrRelTime);
        return this.ACTION(() =>
            this.dN(
                not,
                getV((v) => this.d1(comparison, v))
            )
        );
    });

    private NumberOrRelTime = this.RULE('NumberOrRelTime', () => {
        const v = this.CONSUME(NumberLiteral).payload;
        const rel = this.OPTION(() => this.CONSUME(RelTime).payload);
        return this.ACTION(() =>
            // this is a bit messy, works around a circular dependency.
            // this function knows whether the type should be a number
            // or a Date, but the caller knows what function that value
            // shuold be passed to...
            (cb: (v: number | Date) => Predicate) =>
                cb(rel ? this.dV(relOffset(v, rel.unit, rel.round)) : this.dV(v))
        );
    });

    private ValueExpression = this.RULE('ValueExpression', () => {
        const not = !!this.OPTION(() => this.CONSUME(Exclaim).image);
        this.CONSUME(Equal);
        const fn = this.OR([
            { ALT: () => this.CONSUME(True) && _true },
            { ALT: () => this.CONSUME(False) && _false },
            { ALT: () => this.CONSUME(Null) && _null },
            { ALT: () => this.CONSUME(Undefined) && _undefined },
        ]);
        return this.ACTION(() => this.dN(not, this.d0(fn)));
    });

    private RegexpExpression = this.RULE('RegexpExpression', () => {
        this.CONSUME(Tilde);
        const not =
            this.OR([
                { ALT: () => this.CONSUME(Equal).tokenType },
                { ALT: () => this.CONSUME(Exclaim).tokenType },
            ]) === Exclaim;

        const rexp = this.CONSUME(RegexpLiteral).image;
        const finalSlash = rexp.lastIndexOf('/');

        return this.ACTION(() =>
            this.dN(
                not,
                this.d1(
                    _rex,
                    this.dV(new RegExp(rexp.slice(1, finalSlash), rexp.slice(finalSlash + 1)))
                )
            )
        );
    });

    private TextExpression = this.RULE('TextExpression', () => {
        const not = !!this.OPTION(() => this.CONSUME(Exclaim));
        this.CONSUME(Equal);
        const strict = !!this.OPTION2(() => this.CONSUME2(Equal));
        const str = this.dV(this.SUBRULE(this.TextValue));

        return this.ACTION(() =>
            this.dN(
                not,
                this.d1(
                    notGlob.test(str) ? (strict ? _strictEq : _ciEq) : strict ? _glob : _globCi,
                    str
                )
            )
        );
    });

    private TextValue = this.RULE('TextValue', () => {
        const val = this.OR([
            { ALT: () => this.CONSUME(Field).image },
            { ALT: () => this.CONSUME(SingleQuoted).payload },
            { ALT: () => this.CONSUME(DoubleQuoted).payload },
        ]);
        return this.ACTION(() => val);
    });
}

export class ParseError extends Error {
    lexerErrors: ILexingError[];
    parseErrors: IRecognitionException[];

    constructor(
        message: string,
        lexerErrors: ILexingError[],
        parseErrors: IRecognitionException[]
    ) {
        super(message);
        Object.setPrototypeOf(this, ParseError.prototype);

        this.lexerErrors = lexerErrors;
        this.parseErrors = parseErrors;
    }
}

// reuse the same parser instance.
export const parser = new QueryParser();

// parse our search DSL into a filter function
export const parse = (text: string, debug = false) => {
    // tokenize...
    const lexResult = lexer.tokenize(text);
    // console.log(lexResult.tokens.map((v) => [v.tokenType.name, v.image]));

    // parse...
    parser.input = lexResult.tokens;

    parser.debug = debug;
    const filterFn = parser.parse();

    if (lexResult.errors.length || parser.errors.length) {
        throw new ParseError(
            `Failed to parse query \`${text}\``,
            lexResult.errors.slice(),
            parser.errors.slice()
        );
    }

    return filterFn;
};
