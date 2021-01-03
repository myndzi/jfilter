export type Predicate = (value: any) => boolean;

const globToRegex = (str: string, flags: string): RegExp =>
    new RegExp(
        '^' + str.replace(/[-\/\\^$*+?.()|[\]{}]/g, (c) => (c === '*' ? '.*' : '\\' + c)) + '$',
        flags
    );
const strToRegex = (str: string, flags: string): RegExp =>
    new RegExp('^' + str.replace(/[-\/\\^$*+?.()|[\]{}]/g, (c) => '\\' + c) + '$', flags);

export const _testable = { globToRegex, strToRegex };

export const _looseEq = (val: any) => (target: any): boolean => target == val;
export const _ciEq = (val: string) => _rex(strToRegex(val, 'ui'));
export const _strictEq = (val: any) => (target: any): boolean => target === val;
export const _gt = <T extends number | Date>(rhs: T) => (lhs: T): boolean => +lhs > +rhs;
export const _gte = <T extends number | Date>(rhs: T) => (lhs: T): boolean => +lhs >= +rhs;
export const _lt = <T extends number | Date>(rhs: T) => (lhs: T): boolean => +lhs < +rhs;
export const _lte = <T extends number | Date>(rhs: T) => (lhs: T): boolean => +lhs <= +rhs;
export const _rex = (re: RegExp) => (target: string): boolean => re.test(String(target));
export const _glob = (val: string) => _rex(globToRegex(val, 'u'));
export const _globCi = (val: string) => _rex(globToRegex(val, 'ui'));
export const _in = (set: Set<any>) => (target: any): boolean => set.has(target);
export const _null = () => (target: any): boolean => target === null;
export const _undefined = () => (target: any): boolean => target === undefined;
export const _nullish = () => (target: any): boolean => target == undefined;
export const _true = () => (target: any): boolean => target === true;
export const _false = () => (target: any): boolean => target === false;
export const _truthy = () => (target: any): boolean => !!target;
export const _falsy = () => (target: any): boolean => !target;

export const _range = <T extends number | Date>(
    lower: T,
    lowerInclusive: boolean,
    upper: T,
    upperInclusive: boolean
) => _and((lowerInclusive ? _gte : _gt)(lower), (upperInclusive ? _lte : _lt)(upper));

export const _not = (fn: (t: any) => boolean) => (target: any): boolean => !fn(target);
export const _and = (rhs: (t: any) => boolean, lhs: (t: any) => boolean) => (target: any) =>
    lhs(target) && rhs(target);
export const _or = (rhs: (t: any) => boolean, lhs: (t: any) => boolean) => (target: any) =>
    lhs(target) || rhs(target);

export const _string = (fn: (t: string) => boolean) => (target: any): boolean =>
    !!(typeof target === 'string') && fn(target);
export const _number = (fn: (t: number) => boolean) => (target: any): boolean =>
    typeof target === 'number' && !isNaN(target) && fn(target);
export const _date = (fn: (t: Date) => boolean) => (target: any): boolean =>
    target instanceof Date && !isNaN(+target) && fn(target);
export const _instanceof = <T>(Ctor: { new (...args: any[]): T }, fn: (t: T) => boolean) => (
    target: any
): boolean => target instanceof Ctor && !isNaN(+target) && fn(target);
