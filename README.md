<div align="center">
  <h1>
    <br/>
    <br/>
    🏔
    <br />
    <br />
    Valley
    <br />
    <br />
    <br />
    <br />
  </h1>
  <br />
  <p>
    Simple, type-safe validation.
  </p>
  <br />
  <br />
  <br />
  <br />
</div>

[![npm version](https://img.shields.io/npm/v/@josephluck/valley.svg?style=flat)](https://www.npmjs.com/package/@josephluck/valley) [![CircleCI Status](https://circleci.com/gh/josephluck/valley.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/josephluck/valley)

# Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Functional usage](#functional-usage)

# Features

- Simple and easy to use validation
- Takes type-safety seriously, with maximum inference
- Multiple constraints per-field
- Asynchronous constraints
- Fp-ts compatible version available

# Installation

With yarn:

```bash
yarn add @josephluck/valley
```

With npm:

```bash
npm i --save @josephluck/valley
```

# Usage

The most basic example is a validator with synchronous constraints:

```typescript
import { makeValidator } from "@josephluck/valley";

/**
 * Set up some rules. These can (and should be) shared
 */
const rules = {
  greaterThan: (expected: number) => (value: number) =>
    value > expected
      ? void null
      : `Expected ${value} to be greater than ${expected}`,
  divisibleBy: (div: number) => (value: number) =>
    value % div === 0
      ? void null
      : `Expected ${value} to be divisible by ${div}`,
};

/**
 * Set up a type representing your form fields.
 * This isn't strictly necessary as Valley can infer the shape of your form
 * fields from the constraints you pass it, however it can be convenient to see
 * the shape of your form fields explicitly.
 */
type Fields = {
  twenty: number;
  thirty: number;
  fourty: number;
};

/**
 * Create a validate function passing in a set of constraints per field.
 */
const validate = makeValidator<Fields>({
  twenty: [rules.divisibleBy(10), rules.greaterThan(25)],
  thirty: [rules.divisibleBy(10), rules.greaterThan(25)],
  fourty: rules.divisibleBy(10),
});

/**
 * Run the validate function over the constraints. Each constraint will run in
 * the order passed, and the first to fail will be passed back as a message.
 */
const errors = validate({
  twenty: 20,
  thirty: 30,
  fourty: 40,
});

console.log(errors);
// { twenty: "Expected 20 to be greater than 25", thirty: undefined, fourty: undefined }
```

Constraints can access other field values:

```typescript
const rules = {
  confirmPassword: (
    value: string,
    _key: string,
    fields: { password: string; [key: string]: any }
  ) => (value === fields.password ? void null : "Passwords do not match"),
};
type Fields = {
  email: string;
  password: string;
  confirmPassword: string;
};
const validate = makeValidator<Fields>({
  email: [],
  password: [],
  confirmPassword: rules.confirmPassword,
});
const errors = validate({
  email: "bob@acme.co",
  password: "BobsDaBest",
  confirmPassword: "BobsDaWorst",
});
console.log(errors);
// { email: undefined, password: undefined, confirmPassword: "Passwords do not match" }
```

Constraints can be asynchronous:

```typescript
type Fields = {
  email: string;
};
/**
 * Usually these constraints would all be packaged up in a separate module for
 * reusability, and imported where needed. Otherwise it looks a bit gnarly
 * in-line...
 */
const validate = makeValidator<Fields>({
  email: [
    async (value) => {
      try {
        if (!value.includes(".") || !value.includes("@")) {
          throw new Error("Not a valid email");
        }
      } catch (err) {
        return err.message;
      }
    },
    async (value) => {
      try {
        const response = await api.getAccount(value);
        if (response.data) {
          throw new Error("Account already exists");
        }
      } catch (err) {
        return err.message;
      }
    },
  ],
});
const errors = await validate({
  email: "bob@acme.co",
});
console.log(errors);
// { email: "Account already exists }
```

# Functional usage

Valley is compatible with fp-ts using the fp variant of `makeValidator`. This is useful if you're working with `fp-ts`'s `Either` or `TaskEither` types with `pipe` to validate data before operating on it.

Constraints have to return `Either<string, V>` or `TaskEither<string, V>` depending on whether your constraint is synchronous or asynchronous (where `T` represents the field's value, which should be returned by the constraint function if the field passes validation). 

If all constraints return `Either`s, the validation function will return `Either<Record<keyof Fields, string>, Fields>`. If any constraint return a `TaskEither`, the validation function will return `TaskEither<Record<keyof Fields, string>, Fields>`. The left side of the either is the failed case containing validation messages, and the right side is the fields which are passed through if all constraints for all fields pass.

Here's an example of synchronous validation using `Either`s:

```typescript
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { makeValidator } from "@josephluck/valley/fp";

const isOfType = (type: string) => <T>(value: T): E.Either<string, T> =>
  typeof value === type ? E.right(value) : E.left(`Expected a ${type}`);

const isString = isOfType("string");

const isNumber = isOfType("number");

const isEqualTo = <T>(expected: T) => <V extends T>(
  value: V
): E.Either<string, V> =>
  value === expected
    ? E.right(value)
    : E.left(`Expected ${value} to equal ${expected}`);

const isGreaterThan = <T>(expected: T) => <V extends T>(
  value: V
): E.Either<string, V> =>
  value > expected
    ? E.right(value)
    : E.left(`Expected ${value} to be greater than ${expected}`);

type Fields = {
  name: string;
  age: number;
};

const validate = makeValidator<Fields>({
  name: [isString, isEqualTo("Bob")],
  age: [isNumber, isGreaterThan(40)],
});

pipe(
  validate({
    name: "Bob",
    age: 32,
  }),
  E.fold(
    (errors) => {
      /**
       * If any constraint fails
       */
      console.log(errors);
      // { age: "Expected 32 to be greater than 40", name: undefined }
    },
    (fields) => {
      /**
       * If all constraints pass
       */
      console.log(fields);
      // { name: "Bob", age: 32 }
    }
  )
);
```

If any constraint returns a `TaskEither`, the validate function returns a `TaskEither`:

```typescript
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/pipeable";
import { makeValidator } from "@josephluck/valley/fp";

const isOfType = (type: string) => <T>(value: T): E.Either<string, T> =>
  typeof value === type ? E.right(value) : E.left(`Expected a ${type}`);

const isString = isOfType("string");

const isNumber = isOfType("number");

const isEqualTo = <T>(expected: T) => <V extends T>(
  value: V
): E.Either<string, V> =>
  value === expected
    ? E.right(value)
    : E.left(`Expected ${value} to equal ${expected}`);

const isGreaterThan = <T>(expected: T) => <V extends T>(
  value: V
): E.Either<string, V> =>
  value > expected
    ? E.right(value)
    : E.left(`Expected ${value} to be greater than ${expected}`);

const asyncIsEqualTo = <T>(expected: T) => (value: T) =>
  TE.tryCatch(
    async () => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to equal ${expected}`);
      }
      return value;
    },
    (err: Error) => err.message
  );

const asyncIsGreaterThan = (expected: number) => (value: number) =>
  TE.tryCatch(
    async () => {
      if (value < expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
      return value;
    },
    (err: Error) => err.message
  );

type Fields = {
  name: string;
  age: number;
};

const validate = makeValidator<Fields>({
  name: [isNumber, asyncIsEqualTo("Bob")],
  age: [asyncIsGreaterThan(40), isString],
});

const pipeline = pipe(
  validate({ name: "Bob", age: 50 }),
  TE.mapLeft((errors) => {
    /**
     * If any constraint fails
     */
    console.log(errors);
    // { name: "Expected a number", age: "Expected a string" }
  }),
  TE.map((fields) => {
    /**
     * If all constraints pass
     */
    console.log(fields);
    // { name: "Bob", age: 50 }
  })
);
await pipeline();
```
