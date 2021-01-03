# jfilter

A library to build filtering functions that act on complex Javascript data using a Splunk-esque DSL.

## What's it look like?

```ts
import { parse } from `jfilter`;

const filter = parse('log.level = warn and log.event in (core, transport)');

// results in:
// _and( _prop("log")(_prop("event")(_custom(_in(["core","transport"])))), _prop("log")(_prop("level")(_custom(_ciEq("warn")))) )

filter({ log: { level: 'warn', event: 'transport' } }); // true
filter({ log: { level: 'info', event: 'transport' } }); // false
```

As you can see, the parser builds up a function by composition. The above text is generated by the `debug` argument (`parse(..., true)`) to give some insight into what was built. However, stepping through in a debugger works pretty nicely too.

The result is a build-once-run-many function that can be used to efficiently match or filter data.

## Why?

I got tired of writing bunches of boilerplate. Validator libraries kind of work, but not very well: a filter might express boolean logic such as "an object has `foo` with a value of 1 or `bar` with a value of 10", but that's not the same thing as asking if the object is inherently valid. This leads to some rough edges in trying to use a validator for this task. The good validators also accrue a bunch of human-useful error descriptions that we don't need here.

So, rather than bring in a somewhat heavyweight library like ajv, I instead brought in a somewhat heavyweight library like chevrotain and wrote exactly what I wanted :)

## Features

Mostly, a friendly syntax (see the examples below for the full list). But you can also [create custom accessors](#custom-accessors) on your classes.

## Syntax

You can see a [rail diagram for the grammar](https://ghcdn.rawgit.org/myndzi/jfilter/main/generated_diagrams.html), but here's the breakdown.

### Accessors

Accessors declare how to _access_ the data on the argument you pass to your function. They're the left side of the operation in a query.

-   `foo = 1` - all accessors start with a property access. Extracts `{ foo: <target> }`. Uses `in` to check, so prototype values will be retrieved also
-   `foo.bar = 1` - dot syntax denotes nested property access. Extracts `{ foo: { bar: <target> } }`
-   `foo[bar] = 1` - bracketed notation is also acceptable
-   `foo["bar baz"] = 1` - quotes (single or double) must be used for property accesses that don't conform to `/[A-Za-z]\w*/`
-   `foo[1] = 1` - bracketed numbers denote _indexed_ access. The target is expected to be an array; nothing else is currently valid.
-   `foo["1"] = 1` - access a numeric value as a property
-   `foo[] = 1` - acts as `Array.prototype.some` on the target: returns true if any value matches. The target must be iterable (Array, Set, Map, even String). If the target has a `[Symbol.iterator]` property, the iterator will be called to provide values. If the target is a Map, only its values will be tested.
-   `foo[*] = 1` - acts as `Array.prototype.every` on the target: returns true if _all_ values match. The target must be iterable, just as with the `foo[]` syntax.
-   `foo[].bar` - you can nest 1:1 accessors beyond 1:many accessors, though there are currently no limiting functions on complexity -- take care not to generate explosive cardinality

### Predicates

Predicates declare whether the accessed value matches. They're the right side of the operation in a query. Validation is not performed on the target, but strict equality checks are used (so `1` will not match `"1"`). Dates are currently compared as numbers.

-   `foo = 1` - Basic (numeric) equality check. Number forms accepted include positive, negative, decimal, and "e" notation: `-1.2`, `1e10`, `+3`.
-   `foo > 1` - Numeric inequalities are supported (`>`, `>=`, `<`, `<=`, `!=`)
-   `foo > -1h@h` - Splunk-style relative time specifiers are also supported. Usable units are s, m, h, d for second, minute, hour, day. Positive or negative offset values are allowed. The `@unit` syntax means "round down to nearest". Time is relative to the time the function was built, and rounding is done in UTC.
-   `foo = "bar"` - Basic (string) equality check. Case insensitive.
-   `foo == "bar"` - String equality check, case sensitive.
-   `foo != "bar"` - String inequality is supported too.
-   `foo = bar` - Unquoted values are supported in a limited fashion: only things that would be valid properties can be unquoted.
-   `foo = "ba\"r"` - Escape quotes with backslash, escape backslash with another backslash.
-   `foo = "bar*"` - Globs are supported. Transformed into an anchored RegExp (`"bar*"` will match `barn` but not `rebar`). Case insensitive.
-   `foo == "bar*"` - Case sensitive glob
-   `foo ~= /bar/i` - Specify a regular expression explicitly, if you like!
-   `foo ~! /bar/` - Negate a regular expression
-   `foo in (1, 2, 3)` - Check if value is in a set. Allows strings or numbers, relative time syntax is not rejected but almost certainly useless.
-   `foo in range [1, 10]` - Check if a value is in a range; numeric only. Square brackets are inclusive
-   `foo in range (1, 10)` - Parenthesis are exclusive
-   `foo in range [1, 10)` - Mix and match if you like
-   `foo = true` - Check for true
-   `foo = false` - Check for false
-   `foo = null` - Check for null
-   `foo = undefined` - Check for undefined. Note that you cannot distinguish between "not present on object" and "present with a value of undefined"

### Booleans

You may combine expressions with `and` or `or`. `not` is accepted as a prefix to negate any expression. Group with parenthesis. `and` has a higher precedence than `or`, as you might expect. So:

```ts
parse('foo=1 or foo=2 and foo=2 or foo=2')({ foo: 1 }); // true
parse('(foo=1 or foo=2) and (foo=2 or foo=2)')({ foo: 1 }); // false
```

Ambiguous positioning works either way:

```ts
parse('not foo in range [1,3]')({ foo: 5 }); //true
parse('foo not in range [1,3]')({ foo: 5 }); //true

// you can do this, but why?
parse('not foo not in range [1,3]')({ foo: 5 }); //true
```

### Accessors vs predicates

The functions are broken into two classes: accessors and predicates. Accessors receive the argument you pass in, and call the next function if applicable. An example is `_prop`, which (shortened) looks something like this:

```ts
export const _prop = (key: any) => (fn: Function) => (target: any): boolean => {
    if (/*target is in valid*/) {
        return false;
    }
    return fn(target[key]);
}
```

Accessors call _forwards_ with a subset of the data.

Predicates, on the other hand, compare against the data they receive and return a result. An example is `_gt`, which is just:

```ts
export const _gt = <T extends number | Date>(rhs: T) => (lhs: T): boolean => +lhs > +rhs;
```

Partial application is used in order to build up a sequence of operations that all happen in aggregate at the end.

### Custom accessors

The "seam" between accessors and predicates is always met by a check for a custom accessor. Therefore, if the _last_ property of your expression is a custom class or object, you can customize its behavior. Here's an example:

```ts
import { VALUE, CustomAccessor, Predicate } from 'jfilter';

class User {
    login: string;
    displayName: string;
    constructor(login: string, displayName: string) {
        this.login = login;
        this.displayName = displayName;
    }

    [VALUE]: CustomAccessor = (p: Predicate) => p(this.login) || p(this.displayName);
}
```

`VALUE` is an exported symbol, so it's guaranteed not to conflict with anything. Modern Javascript is, however, required.

Your custom accessor must return a boolean, and may (or may not, but probably should) call the predicate. Think of it as giving zero or more values to the system. In the above example, both of the following filters would match:

```ts
const user = new User('myndzi', 'ızpuʎɯ');
parse('user = myndzi')({ user }); // true
parse('user = "ızpuʎɯ"')({ user }); // true -- note the required quotes for the unicode text
```
