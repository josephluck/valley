export function makeValidator<Fs extends Fields>(
  constraints: FieldConstraintsMap<Fs>
): (fields: Fs) => ValidationResult<Fs>;

export function makeValidator<Fs extends Fields>(
  constraints: AsyncFieldConstraintsMap<Fs>
): (fields: Fs) => Promise<ValidationResult<Fs>>;

export function makeValidator<Fs extends Fields>(
  constraints: FieldConstraintsMap<Fs> | AsyncFieldConstraintsMap<Fs>
) {
  return function validate(
    fields: Fs
  ): ValidationResult<Fs> | Promise<ValidationResult<Fs>> {
    type Fk = keyof Fs;
    const fieldKeys = Object.keys(constraints);

    const results = fieldKeys.reduce((acc, fieldKey: Fk) => {
      const fieldValue = fields[fieldKey];
      const fieldConstraint = constraints[fieldKey];

      /**
       * Constraints can either be an array of constraint functions or a single
       * constraint function. To make the following code easier, wrap single
       * constraints up in to an array.
       */
      const fieldConstraints = (typeof fieldConstraint === "function"
        ? [fieldConstraint]
        : fieldConstraint) as Constraint<any, any, any>[];

      return {
        ...acc,
        [fieldKey]: fieldConstraints.reduce(
          (err, fn) => [...err, fn(fieldValue, fieldKey, fields)],
          []
        ),
      };
    }, fields);

    const resultsArr = Object.values(results);
    const constraintsAreAsync = anyPromise(flatten(resultsArr));

    if (constraintsAreAsync) {
      /**
       * Unpack the record of constraint results from:
       * Record<keyof Fields, Promise<string | never>[]>
       * to:
       * Record<keyof Fields, string | never>
       */
      const unpackAllAsyncConstraints = async () => {
        let asyncResults: ValidationResult<Fs> = {} as any;
        for (let i = 0, x = resultsArr.length; i < x; i++) {
          const fieldKey: keyof Fs = fieldKeys[i];
          const constraintResultsForField = resultsArr[i];
          const unpackedConstraintMessages = await Promise.all<string>(
            promisifyArr(constraintResultsForField)
          );
          const message = unpackedConstraintMessages.find(Boolean);
          asyncResults[fieldKey] = message;
        }
        return asyncResults;
      };
      return unpackAllAsyncConstraints();
    }

    /**
     * Unpack synchronous constraints by the first message in the list of
     * results. If there is no message, the validation result will be undefined
     */
    return Object.keys(results).reduce((acc, key) => {
      return {
        ...acc,
        [key]: results[key].find(Boolean),
      };
    }, results);
  };
}

const anyPromise = (values: any[]): boolean =>
  Boolean(
    values.find(
      (result) =>
        typeof result === "object" && typeof result.then === "function"
    )
  );

const flatten = <T>(values: T[][]): T[] =>
  values.reduce((acc, curr) => [...acc, ...curr], []);

/**
 * Takes an array of values and makes each value a Promise if it isn't already
 */
const promisifyArr = (arr: any[]): Promise<any>[] =>
  arr.map((result) =>
    !anyPromise([result]) ? Promise.resolve(result) : result
  );

export type FieldValue = any;

export type FieldKey = string | number | symbol;

export type Fields = { [fieldKey: string]: FieldValue };

export type FieldValidationResult = string | never;

export type Constraint<
  Fv extends FieldValue,
  Fk extends FieldKey,
  Fs extends Fields
> = (value: Fv, key: Fk, fields: Fs) => FieldValidationResult;

export type FieldConstraintsMap<Fs extends Fields> = {
  [Fk in keyof Fs]:
    | Constraint<Fs[Fk], Fk, Fs>
    | Array<Constraint<Fs[Fk], Fk, Fs>>;
};

export type AsyncFieldValidationResult = Promise<string> | never;

export type AsyncConstraint<
  Fv extends FieldValue,
  Fk extends FieldKey,
  Fs extends Fields
> = (value: Fv, key: Fk, fields: Fs) => AsyncFieldValidationResult;

export type AsyncFieldConstraintsMap<Fs extends Fields> = {
  [Fk in keyof Fs]:
    | AsyncConstraint<Fs[Fk], Fk, Fs>
    | Array<AsyncConstraint<Fs[Fk], Fk, Fs> | Constraint<Fs[Fk], Fk, Fs>>;
};

export type ValidationResult<Fs extends Fields> = {
  [Fk in keyof Fs]: FieldValidationResult;
};
