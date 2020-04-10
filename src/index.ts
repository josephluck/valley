export function validate<Fs extends Fields, C extends Constraints<Fs>>(
  fields: Fs,
  constraints: C
): ValidationResult<Fs>;

export function validate<Fs extends Fields, C extends AsyncConstraints<Fs>>(
  fields: Fs,
  constraints: C
): Promise<ValidationResult<Fs>>;

export function validate<Fs extends Fields, C extends Constraints<Fs>>(
  fields: Fs,
  constraints: C
): ValidationResult<Fs> | Promise<ValidationResult<Fs>> {
  const fieldKeys = Object.keys(constraints);
  const results = fieldKeys.reduce((acc, key: keyof Fs) => {
    const constraint = constraints[key];
    const value = fields[key];

    /**
     * Constraints can either be an array of constraint functions or a single
     * constraint function. To make the following code easier, wrap single
     * constraints up in to an array.
     */
    const constraintsToRun = (typeof constraint === "function"
      ? [constraint]
      : constraint) as Constraint<any, any, any>[];

    return {
      ...acc,
      [key]: constraintsToRun.reduce((err, fn) => {
        /**
         * Wrap up all async constraint promises in an array that can be
         * unwrapped with Promise.all later to extract messages.
         */
        if (anyPromise([err])) {
          return [...err, fn(key, value, fields)];
        }
        /**
         * Early return if there's already a synchronous validation message.
         */
        if (err.length > 0) {
          return err;
        }
        /**
         * Construct the first message.
         */
        const e = fn(key, value, fields);
        return e ? [e] : [];
      }, []),
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
          constraintResultsForField
        );
        asyncResults[fieldKey] = unpackedConstraintMessages.find(Boolean);
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
}

const anyPromise = (values: any[]): boolean =>
  Boolean(values.find((result) => typeof result !== "string"));

const flatten = <T>(values: T[][]): T[] =>
  values.reduce((acc, curr) => [...acc, ...curr], []);

export type FieldValue = any;

export type FieldKey = string | number | symbol;

export type Fields = { [key: string]: FieldValue };

export type FieldValidationResult = string | never;

export type Constraint<
  K extends FieldKey,
  V extends FieldValue,
  Fs extends Fields
> = (key: K, value: V, fields: Fs) => FieldValidationResult;

export type Constraints<Fs extends Fields> = {
  [Key in keyof Fs]:
    | Constraint<Key, Fs[Key], Fs>
    | Array<Constraint<Key, Fs[Key], Fs>>;
};

export type AsyncFieldValidationResult = Promise<string> | never;

export type AsyncConstraint<
  Key extends FieldKey,
  Fv extends FieldValue,
  Fs extends Fields
> = (key: Key, value: Fv, fields: Fs) => AsyncFieldValidationResult;

export type AsyncConstraints<Fs extends Fields> = {
  [Key in keyof Fs]:
    | AsyncConstraint<Key, Fs[Key], Fs>
    | Array<AsyncConstraint<Key, Fs[Key], Fs>>;
};

export type ValidationResult<Fs extends Fields> = {
  [Key in keyof Fs]: FieldValidationResult;
};
