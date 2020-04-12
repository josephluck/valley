import { pipe } from "fp-ts/lib/pipeable";
import * as E from "fp-ts/lib/Either";
import test from "tape";
import { makeValidator } from "../fp";

test("FP - Validates simple valid fields", (t) => {
  t.plan(1);
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
      age: 45,
    }),
    E.fold(
      () => {
        t.fail("Validation shouldn't have passed");
      },
      (fields) => {
        t.deepEqual(
          fields,
          { name: "Bob", age: 45 },
          "Successful validation passes through fields unchanged"
        );
      }
    )
  );
});

test("FP - Validates simple invalid fields", (t) => {
  t.plan(3);
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
        t.pass("Validation fails");
        t.equal(
          errors.age,
          "Expected 32 to be greater than 40",
          "Age fails with the correct constraint message"
        );
        t.equal(
          typeof errors.name,
          "undefined",
          "Name passes without a constraint message"
        );
      },
      () => {
        t.fail("Validation shouldn't have passed");
      }
    )
  );
});

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
