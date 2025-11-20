export function isString(obj: unknown, regex?: RegExp): obj is string {
    return typeof obj === "string" && (regex ? regex.test(obj) : true)
}

export function isNumber(obj: unknown): obj is number {
    return typeof obj === "number" && !isNaN(obj)
} 