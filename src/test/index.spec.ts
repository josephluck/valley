import test from "tape";
import { validate } from "../";

const expectStringMatch = (expected: string) => (_: string, actual: string) =>
  actual === expected ? void null : `Expected ${actual} to be ${expected}`;

const asyncExpectStringMatch = (expected: string) => async (
  _: string,
  actual: string
) =>
  new Promise<string>((resolve) =>
    actual === expected
      ? resolve(void null)
      : resolve(`Expected ${actual} to be ${expected}`)
  );

const expectGreaterThan = (expected: number) => (_: string, actual: number) =>
  actual > expected
    ? void null
    : `Expected ${actual} to be greater than ${expected}`;

const expectDivisibleBy = (div: number) => (_: string, value: number) =>
  value % div === 0 ? void null : `Expected ${value} to be divisible by ${div}`;

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
    name: expectStringMatch("Bob"),
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
    name: expectStringMatch("Bob"),
    age: (key, value, fields) =>
      value <= 30 ? `${fields.name}'s ${key} should be at least 30` : void null,
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
    twenty: [expectDivisibleBy(10), expectGreaterThan(25)],
    thirty: [expectDivisibleBy(10), expectGreaterThan(25)],
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
    name: asyncExpectStringMatch("Bob"),
    age: async () => {
      try {
        await awaitResolve();
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
    age: [
      async () => {
        try {
          await awaitResolve();
        } catch (err) {
          return "First constraint";
        }
      },
      async () => {
        try {
          await awaitReject();
        } catch (err) {
          return "Second constraint";
        }
      },
    ],
  });
  t.equal(typeof result.age, "string", "Age fails");
  t.equal(
    result.age,
    "Second constraint",
    "Age fails with the correct constraint"
  );
});

const awaitResolve = () => new Promise((resolve) => resolve());
const awaitReject = () => new Promise((_, reject) => reject());
