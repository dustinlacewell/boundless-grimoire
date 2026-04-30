# No Non-Null Assertions

Never use `!` (non-null assertion). It indicates a poverty of type information.

- Fix the types so the compiler knows the value is non-null, or
- Restructure the code so the narrowing is explicit (e.g. return the typed value from the function that establishes non-nullability)
