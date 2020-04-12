import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";

export function makeValidator<Fs extends Fields>(
  constraints: FieldConstraintsMap<Fs>
) {
  return function validate(fields: Fs): E.Either<ValidationResult<Fs>, Fs> {
    type Fk = keyof Fs;
    type Fv = Fs[Fk];

    const results = Object.keys(fields).map((fieldKey: Fk) => {
      const fieldValue = fields[fieldKey];
      const fieldConstraint = constraints[fieldKey];
      const fieldConstraints = (typeof fieldConstraint === "function"
        ? [fieldConstraint]
        : fieldConstraint) as ConstraintFn<any, any, any>[];

      return fieldConstraints.reduce(
        (acc, fn) => (E.isLeft(acc) ? acc : fn(fieldValue, fieldKey, fields)),
        E.right<string, Fv>(fieldValue)
      );
    });

    const hasFailed = results.some(E.isLeft);

    return hasFailed
      ? E.left(
          Object.keys(fields).reduce(
            (acc: ValidationResult<Fs>, fieldKey: Fk, i) => ({
              ...acc,
              [fieldKey]: pipe(results[i], E.swap, E.getOrElse(passedField)),
            }),
            fields
          )
        )
      : E.right(fields);
  };
}

const passedField = () => void null;

export type Fields = Record<string, any>;

export type ConstraintFn<Fv, Fk, Fs> = (
  value: Fv,
  key: Fk,
  fields: Fs
) => E.Either<string, Fv>;

export type FieldConstraintsMap<Fs extends Fields> = {
  [Fk in keyof Fs]: Array<ConstraintFn<Fs[Fk], Fk, Fs>>;
};

export type ValidationResult<Fs extends Fields> = { [Fk in keyof Fs]: string };
