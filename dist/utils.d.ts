import { Validations, Value, Values } from './interfaces';
declare const _default: {
    arraysDiffer(a: unknown[], b: unknown[]): boolean;
    objectsDiffer(a: object, b: object): boolean;
    isSame(a: unknown, b: unknown): boolean;
    find<T>(collection: T[], fn: (item: T) => boolean): T;
    runRules(value: Value, currentValues: Values, validations: Validations, validationRules: Validations): {
        errors: string[];
        failed: string[];
        success: string[];
    };
};
export default _default;
