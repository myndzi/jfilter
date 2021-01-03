import { ShuntingYard } from './shuntingyard';

const AND = Symbol('AND');
const OR = Symbol('OR');
const LParen = Symbol('LParen');
const RParen = Symbol('RParen');

const _and = (a: string, b: string) => `and(${a}, ${b})`;
const _or = (a: string, b: string) => `or(${a}, ${b})`;

describe('ShuntingYard', () => {
    let yard: ShuntingYard<symbol, string>;
    beforeEach(() => {
        yard = new ShuntingYard({ AND, OR, LParen, RParen }, { _and, _or });
    });

    it('groups and before or', () => {
        yard.pushExpr('a');
        yard.pushOp(OR);
        yard.pushExpr('b');
        yard.pushOp(AND);
        yard.pushExpr('c');
        yard.pushOp(OR);
        yard.pushExpr('d');
        expect(yard.flush()).toBe('or(d, or(and(c, b), a))');
    });
    it('subverts the order with parenthesis', () => {
        yard.pushOp(LParen);
        yard.pushExpr('a');
        yard.pushOp(OR);
        yard.pushExpr('b');
        yard.pushOp(RParen);
        yard.pushOp(LParen);
        yard.pushOp(AND);
        yard.pushExpr('c');
        yard.pushOp(OR);
        yard.pushExpr('d');
        yard.pushOp(RParen);
        expect(yard.flush()).toBe('or(d, and(c, or(b, a)))');
    });
});
