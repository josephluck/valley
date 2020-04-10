type FieldValue = any;

type FieldKey = string | number | symbol;

// NB: [key: FieldKey]
type IFields = { [key: string]: FieldValue };

type FieldValidationResult = string | never;

type Constraint<
  Key extends FieldKey,
  Value extends FieldValue,
  Fields extends IFields
> = (key: Key, value: Value, fields: Fields) => FieldValidationResult;

type IConstraints<Fields extends IFields> = {
  [Key in keyof Fields]:
    | Constraint<Key, Fields[Key], Fields>
    | Array<Constraint<Key, Fields[Key], Fields>>;
};

type AsyncFieldValidationResult = Promise<string> | never;

type AsyncConstraint<
  Key extends FieldKey,
  Value extends FieldValue,
  Fields extends IFields
> = (key: Key, value: Value, fields: Fields) => AsyncFieldValidationResult;

type IAsyncConstraints<Fields extends IFields> = {
  [Key in keyof Fields]:
    | AsyncConstraint<Key, Fields[Key], Fields>
    | Array<AsyncConstraint<Key, Fields[Key], Fields>>;
};

type ValidationResult<Fields> = {
  [Key in keyof Fields]: FieldValidationResult;
};

export function validate<
  Fields extends IFields,
  Constraints extends IConstraints<Fields>
>(fields: Fields, constraints: Constraints): ValidationResult<Fields>;

export function validate<
  Fields extends IFields,
  Constraints extends IAsyncConstraints<Fields>
>(fields: Fields, constraints: Constraints): Promise<ValidationResult<Fields>>;

export function validate<
  Fields extends IFields,
  Constraints extends IConstraints<Fields>
>(
  fields: Fields,
  constraints: Constraints
): ValidationResult<Fields> | Promise<ValidationResult<Fields>> {
  const results = Object.keys(constraints).reduce((acc, key: keyof Fields) => {
    const constraint = constraints[key];
    const value = fields[key];
    const constraintsToRun = (typeof constraint === "function"
      ? [constraint]
      : constraint) as Constraint<any, any, any>[];

    return {
      ...acc,
      [key]: constraintsToRun.reduce((err, fn) => {
        if (anyPromise([err])) {
          return [...err, fn(key, value, fields)];
        }
        if (err) {
          return err;
        }
        return [fn(key, value, fields)];
      }, []),
    };
  }, fields);

  const isAsync = anyPromise(flatten(Object.values(results)));

  if (isAsync) {
    const keys = Object.keys(results);
    const promises = Object.values(results);
    const doResolves = async () => {
      let response = {};
      for (let i = 0, x = promises.length; i < x; i++) {
        const key = keys[i];
        const promisesForKey = promises[i];
        const errs = await Promise.all(promisesForKey);
        response[key] = errs.find(Boolean);
      }
      return response;
    };
    return doResolves() as any;
  } else {
    return Object.keys(results).reduce((acc, key) => {
      return {
        ...acc,
        [key]: results[key].find(Boolean),
      };
    }, results);
  }
}

const anyPromise = (values: any[]): boolean =>
  Boolean(values.find((result) => typeof result !== "string"));

const flatten = <T>(values: T[][]): T[] =>
  values.reduce((acc, curr) => [...acc, ...curr], []);
