import test from "tape";
import { validate } from "../";

test("Validates simple valid fields", (t) => {
  t.plan(2);
  type IFields = {
    name: string;
    age: number;
  };
  const fields: IFields = {
    name: "Bob",
    age: 32,
  };
  const result = validate(fields, {
    name: rules.stringMatch("Bob"),
    age: (key, value, fields) =>
      value <= 30 ? `${fields.name}'s ${key} should be at least 30` : void null,
  });
  t.equal(typeof result.name, "undefined", "Name passes");
  t.equal(typeof result.age, "undefined", "Age passes");
});

test("Validates simple invalid fields", (t) => {
  t.plan(2);
  type IFields = {
    name: string;
    age: number;
  };
  const fields: IFields = {
    name: "Sally",
    age: 28,
  };
  const result = validate(fields, {
    name: rules.stringMatch("Bob"),
    age: rules.lessThan(30),
  });
  t.equal(typeof result.name, "string", "Name fails");
  t.equal(typeof result.age, "string", "Age fails");
});

test("Validates multiple constraints per field", (t) => {
  t.plan(3);
  type Fields = {
    twenty: number;
    thirty: number;
  };
  const fields: Fields = {
    twenty: 20,
    thirty: 30,
  };
  const result = validate(fields, {
    twenty: [rules.divisibleBy(10), rules.greaterThan(25)],
    thirty: [rules.divisibleBy(10), rules.greaterThan(25)],
  });
  t.equal(typeof result.twenty, "string", "Twenty fails");
  t.equal(result.twenty, "Expected 20 to be greater than 25");
  t.equal(typeof result.thirty, "undefined", "Thirty passes");
});

test("Validates with asynchronous constraints", async (t) => {
  t.plan(2);
  type Fields = {
    name: string;
    age: number;
  };
  const fields: Fields = {
    name: "Sam",
    age: 35,
  };
  const result = await validate(fields, {
    name: rules.asyncStringMatch("Bob"),
    age: async (_, value) => {
      try {
        if (value < 30) {
          throw new Error();
        }
      } catch (err) {
        return "Fails";
      }
    },
  });
  t.equal(typeof result.name, "string", "Name fails");
  t.equal(typeof result.age, "undefined", "Age passes");
});

test("Validates with multiple asynchronous constraints", async (t) => {
  t.plan(2);
  type Fields = {
    age: number;
  };
  const fields: Fields = {
    age: 20,
  };
  const result = await validate(fields, {
    age: [rules.asyncGreaterThan(10), rules.asyncLessThan(15)],
  });
  t.equal(typeof result.age, "string", "Age fails");
  t.equal(
    result.age,
    "Expected 20 to be less than 15",
    "Age fails with the correct constraint"
  );
});

const rules = {
  stringMatch: (expected: string) => (_: string, actual: string) =>
    actual === expected ? void null : `Expected ${actual} to be ${expected}`,

  asyncStringMatch: (expected: string) => async (_: string, actual: string) => {
    try {
      if (actual !== expected) {
        throw new Error();
      }
    } catch (err) {
      return `Expected ${actual} to be ${expected}`;
    }
  },

  lessThan: (expected: number) => (key: string, value: number) =>
    value <= 30 ? `${key} should be at least ${expected}` : void null,

  greaterThan: (expected: number) => (_: string, actual: number) =>
    actual > expected
      ? void null
      : `Expected ${actual} to be greater than ${expected}`,

  asyncGreaterThan: (expected: number) => async (_: string, actual: number) => {
    try {
      if (actual < expected) {
        throw new Error();
      }
    } catch (err) {
      return Promise.resolve(
        `Expected ${actual} to be greater than ${expected}`
      );
    }
  },

  asyncLessThan: (expected: number) => async (_: string, actual: number) => {
    try {
      if (actual > expected) {
        throw new Error();
      }
    } catch (err) {
      return Promise.resolve(`Expected ${actual} to be less than ${expected}`);
    }
  },

  divisibleBy: (div: number) => (_: string, value: number) =>
    value % div === 0
      ? void null
      : `Expected ${value} to be divisible by ${div}`,
};
