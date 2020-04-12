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
