import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/pipeable";

export function makeValidator<Fs extends Fields>(
  constraints: FieldConstraintsMap<Fs>
): (fields: Fs) => E.Either<ValidationResult<Fs>, Fs>;

export function makeValidator<Fs extends Fields>(
  constraints: AsyncFieldConstraintsMap<Fs>
): (fields: Fs) => TE.TaskEither<ValidationResult<Fs>, Fs>;

export function makeValidator<Fs extends Fields>(
  constraints: FieldConstraintsMap<Fs> | AsyncFieldConstraintsMap<Fs>
) {
  type Return =
    | E.Either<ValidationResult<Fs>, Fs>
    | TE.TaskEither<ValidationResult<Fs>, Fs>;
  return function validate(fields: Fs): Return {
    type Fk = keyof Fs;
    type Fv = Fs[Fk];

    const fieldKeys: Fk[] = Object.keys(fields);

    const results = fieldKeys.reduce((acc, fieldKey: Fk) => {
      const fieldValue: Fv = fields[fieldKey];
      const fieldConstraint = constraints[fieldKey];
      const fieldConstraints = (typeof fieldConstraint === "function"
        ? [fieldConstraint]
        : fieldConstraint) as ConstraintFn<any, any, any>[];

      return {
        ...acc,
        [fieldKey]: fieldConstraints.reduce(
          (err, fn) => [...err, fn(fieldValue, fieldKey, fields)],
          []
        ),
      };
    }, fields);

    const resultsArr = Object.values(results);
    const constraintsAreAsync = anyTaskEither(flatten(resultsArr));

    if (constraintsAreAsync) {
      return pipe(
        TE.tryCatch(
          async () => {
            let asyncResults: ValidationResult<Fs> = {} as any;
            for (let i = 0, x = resultsArr.length; i < x; i++) {
              const fieldKey: keyof Fs = fieldKeys[i];
              const constraintResultsForField = resultsArr[i].map((fn) => fn());
              const unpackedConstraintMessages = await Promise.all(
                constraintResultsForField
              );
              const message =
                unpackedConstraintMessages.find(E.isLeft) || E.left(void null);
              asyncResults[fieldKey] = pipe(
                message,
                E.swap,
                E.getOrElse(passedField)
              );
            }
            if (Object.values(asyncResults).some(Boolean)) {
              throw asyncResults;
            }
          },
          (err: ValidationResult<Fs>) => err
        ),
        TE.map(() => fields)
      );
    }

    const hasFailed = flatten(resultsArr).some(E.isLeft);

    return hasFailed
      ? E.left(
          Object.keys(fields).reduce(
            (acc: ValidationResult<Fs>, fieldKey: Fk) => {
              const firstErr = results[fieldKey].find(E.isLeft) || E.right("");
              return {
                ...acc,
                [fieldKey]: pipe(firstErr, E.swap, E.getOrElse(passedField)),
              };
            },
            fields
          )
        )
      : E.right(fields);
  };
}

const passedField = () => void null;

// NB: this isn't a great way of figuring out whether the value is TaskEither or not...
const isTaskEither = (value: any): boolean => typeof value === "function";

const anyTaskEither = (values: any[]): boolean =>
  Boolean(values.find(isTaskEither));

const flatten = <T>(values: T[][]): T[] =>
  values.reduce((acc, curr) => [...acc, ...curr], []);

export type Fields = Record<string, any>;

export type ConstraintFn<Fv, Fk, Fs> = (
  value: Fv,
  key: Fk,
  fields: Fs
) => E.Either<string, Fv>;

export type FieldConstraintsMap<Fs extends Fields> = {
  [Fk in keyof Fs]:
    | ConstraintFn<Fs[Fk], Fk, Fs>
    | Array<ConstraintFn<Fs[Fk], Fk, Fs>>;
};

export type ValidationResult<Fs extends Fields> = { [Fk in keyof Fs]: string };

export type AsyncConstraintFn<Fv, Fk, Fs> = (
  value: Fv,
  key: Fk,
  fields: Fs
) => TE.TaskEither<string, Fv>;

export type AsyncFieldConstraintsMap<Fs extends Fields> = {
  [Fk in keyof Fs]:
    | AsyncConstraintFn<Fs[Fk], Fk, Fs>
    | Array<AsyncConstraintFn<Fs[Fk], Fk, Fs>>;
};
