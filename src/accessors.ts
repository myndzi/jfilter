import type { Predicate } from './predicates';

export const VALUE: unique symbol = Symbol('jfilter.match');
export type CustomAccessor = (fn: Predicate) => boolean;

export const _custom = (fn: Function) => (target: any): boolean =>
    target && typeof target === 'object' && VALUE in target ? target[VALUE](fn) : fn(target);

export const _prop = (key: any) => (fn: Function) => (target: any): boolean => {
    if (target === null || typeof target !== 'object') {
        return false;
    }

    if (target instanceof Map) {
        if (!target.has(key)) {
            return false;
        }
        return fn(target.get(key));
    }

    if (!(key in target)) {
        return false;
    }

    return fn(target[key]);
};

export const _index = (idx: number) => (fn: Function) => (target: any[]): boolean => {
    if (!Array.isArray(target)) {
        return false;
    }
    if (
        isNaN(idx) ||
        !isFinite(idx) ||
        idx < 0 ||
        idx >= target.length ||
        Math.floor(idx) !== idx
    ) {
        return false;
    }

    return fn(target[idx]);
};

const values = (target: any): Iterable<any> | null => {
    if (target == null) {
        return null;
    }
    try {
        // Map's default iterator produces [key, value]; however, Map has
        // a `values` method that gives just the values, which is closest
        // to what we want
        if (target instanceof Map) {
            return target.values();
        }
        // the other default iterators are fine
        return target[Symbol.iterator]();
    } catch (e) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#The_iterator_protocol
        // Note: It is not possible to know reflectively whether a particular object implements the iterator protocol.
        // Also, the default iterator is not defined to have a particular shape -- Map's default iterator
        // is .entries() and not .values() :\
        // Since we also can't tell if .values, when it exists, is an iterator, we just have to try-catch
        if (e instanceof TypeError) {
            return null;
        }
        throw e;
    }
};

export const _some = (fn: Function) => (target: any): boolean => {
    const vs = values(target);
    if (vs === null) {
        return false;
    }
    for (const v of vs) {
        if (fn(v)) {
            return true;
        }
    }
    return false;
};

export const _every = (fn: Function) => (target: any): boolean => {
    const vs = values(target);
    if (vs === null) {
        return false;
    }
    for (const v of vs) {
        if (!fn(v)) {
            return false;
        }
    }
    return true;
};
