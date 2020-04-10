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

type ValidationResult<Fields> = {
  [Key in keyof Fields]: FieldValidationResult;
};

export const validate = <
  Fields extends IFields,
  Constraints extends IConstraints<Fields>
>(
  fields: Fields,
  constraints: Constraints
): ValidationResult<Fields> => {
  return Object.keys(constraints).reduce((acc, key: keyof Fields) => {
    const constraint = constraints[key];
    const value = fields[key];
    const constraintsToRun = (typeof constraint === "function"
      ? [constraint]
      : constraint) as Constraint<any, any, any>[];
    return {
      ...acc,
      [key]: constraintsToRun.reduce(
        (err, fn) => (err ? err : fn(key, value, fields)),
        void null
      ),
    };
  }, fields);
};
