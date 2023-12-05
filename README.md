# promisemut

Chain instructions for mutating the fulfillment value of a not yet constructed promise. This package allows to easily break promise chains into smaller, more manageable functions. Mutators for objects are described intuitively by using an object as a template. It is possible to perform selected array operations directly on array promises. Nested loops can break out of parent loops and delete array elements.

Although this could be implemented without promises, they make sense here because of the intuitive data flow. Furthermore, it allows a mutator to return a promise.

## Getting started

Let's make the following code return the modified object instead. It may be necessary to get familiar with [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) and [arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions).

```
Promise.resolve({ age: 0 }).then(
  (value) => value.age += 1
).then(console.log)
// Output: 1
```

The function can be simply wrapped in `mutate`.

```
import { mutate } from 'promisemut'

Promise.resolve({ age: 0 }).then(
  mutate((value) => value.age += 1)
).then(console.log)
// Output: { age: 1 }
```

This is called an `update` and can be described through a template object that has a function for each key it wants to update.

```
import { update } from 'promisemut'

Promise.resolve({ age: 0 }).then(
  update({
    age: (value) => value + 1
  })
).then(console.log)
// Output: { age: 1 }
```

It is simple to make the function easily reusable.

```
let increaseAge = update({
  age: (value) => value + 1
})

increaseAge({ age: 0 }).then(console.log)
// Output: { age: 1 }
```

The template can access the object as well.

```
let needsMaintenance = update({
  maintained: (value, key, item) => item.age < 1
})

needsMaintenance({ age: 0 }).then(console.log)
// Output: { age: 0, maintained: true }
```

The two previous functions can be easily combined.

```
let needsMaintenanceSoon = increaseAge.then(needsMaintenance)

needsMaintenanceSoon({ age: 0 }).then(console.log)
// Output: { age: 1, maintained: false }
```

In case the original object should not be modified, import `replace` instead of `update`.

### Arrays

This package simplifies the array operations `filter`, `sort` and `map`. If `filter` receives a string instead of a function then array entries are included if the value for the property with this string is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy). It is possible to `map` objects as well (index = key).

The loop behavior of `mutateEach` is similar to `forEach`. However, the mutator has access to advanced operations. The third argument the mutator receives is the array that temporarily supports two additional methods.

If an entry of the array is removed via `array.remove(entry)` then it will be filtered before the array is returned. Additionally if the loop hasn't reached the entry it will be skipped.

The second method is `array.resolve()`. It may return the resolve function of the parent loop. In this case `array.resolve()()` would break out of `mutatePairs`, which uses `mutateEach` within `mutateEach` to loop through all pairs. The second argument is not the index but a second entry.

## Advanced

Many advantages of this approach only become apparent when the mutator requires arguments that do not traverse through the promise chain.

```
let increaseAge = increment => update({
  age: (value) => value + increment
})

promise.then(increaseAge(2)).then(console.log)
```

There is direct access to the `resolve` function as well. It can be called like `promise.then(resolve.then(fn))` to allow to work with a fulfilled like it is a promise. All other functions are built on that and support to be called directly on resolve like `resolve.mutate(fn).mutate(fn)` instead of `resolve.then(mutate(fn).then(mutate(fn)))`. The value resolve receives can be accessed later in the chain with `then2`. This works similarly to the argument of the mutator above but this time the argument is dynamic.