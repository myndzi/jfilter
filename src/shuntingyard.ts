import Deque from 'double-ended-queue';

type TokenConfig<T> = {
    AND: T;
    OR: T;
    LParen: T;
    RParen: T;
};
type CombinerConfig<U> = {
    _and: (l: U, r: U) => U;
    _or: (l: U, r: U) => U;
};

// limited ShuntingYard algorithm, simplified for our use
// the chevrotain parser handles NOT and almost everything
// else -- we need only to reorder AND / OR and parenthesized
// expressions
export class ShuntingYard<T, U> {
    AND: T;
    OR: T;
    LParen: T;
    RParen: T;
    exprs: Deque<U>;
    ops: Deque<T>;
    _and: (l: U, r: U) => U;
    _or: (l: U, r: U) => U;

    constructor(tokens: TokenConfig<T>, fns: CombinerConfig<U>) {
        this.AND = tokens.AND;
        this.OR = tokens.OR;
        this.LParen = tokens.LParen;
        this.RParen = tokens.RParen;
        this.exprs = new Deque<U>();
        this.ops = new Deque<T>();
        this._and = fns._and;
        this._or = fns._or;
    }
    pops(op: T): void {
        switch (op) {
            case this.AND:
                // we don't deal with the case of the deque being empty; typescript
                // can't seem to infer it by checking .length, but we know it to be
                // true
                this.exprs.push(this._and(this.exprs.pop() as U, this.exprs.pop() as U));
                break;
            case this.OR:
                // we don't deal with the case of the deque being empty; typescript
                // can't seem to infer it by checking .length, but we know it to be
                //
                this.exprs.push(this._or(this.exprs.pop() as U, this.exprs.pop() as U));
                break;
            /* istanbul ignore next */
            default:
                // there should only be and/or on the stack when
                // we run this function
                throw new Error('implementation error');
        }
    }
    pushExpr(item: U) {
        this.exprs.push(item);
    }
    pushOp(item: T) {
        switch (item) {
            case this.LParen:
            case this.AND:
                this.ops.push(item);
                break;
            case this.OR:
                // no need to check precedence: we are only concerned with
                // AND (higher precedence) and LParen (grouping rules)
                while (this.ops.length && this.ops.peekBack() !== this.LParen) {
                    // we should be guaranteed not undefined -- opStack.length was >0
                    this.pops(this.ops.pop() as T);
                }
                this.ops.push(item);
                break;
            case this.RParen:
                while (this.ops.length) {
                    const op = this.ops.pop();
                    if (op === this.LParen) {
                        // discard left parenthesis and end
                        break;
                    }
                    // we should be guaranteed not undefined -- opStack.length was >0
                    this.pops(op as T);
                }
                break;
            /* istanbul ignore next */
            default:
                // we should only receive tokens that match the switch
                throw new Error('implementation error');
        }
    }
    flush() {
        while (this.ops.length) {
            this.pops(this.ops.pop() as T);
        }
        /* istanbul ignore next */
        if (this.exprs.length !== 1) {
            throw new Error('implementation error');
        }
        return this.exprs.pop() as U;
    }
}
