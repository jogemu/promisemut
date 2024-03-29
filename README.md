# promisemut

Chain instructions for mutating the fulfillment value of a not yet constructed promise. This package allows to easily break promise chains into smaller, more manageable functions. Mutators for objects are described intuitively by using an object as a template. It is possible to perform array operations directly on array promises.

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
import resolve from 'promisemut'

Promise.resolve({ age: 0 }).then(
  resolve.mutate((value) => value.age += 1)
).then(console.log)
// Output: { age: 1 }
```

Since this `assign`s a new value to `age` it can be described through a template object that has an independent function for each key.

```
import resolve from 'promisemut'

Promise.resolve({ age: 0 }).then(
  resolve.assign({
    age: (value) => value + 1
  })
).then(console.log)
// Output: { age: 1 }
```

It is simple to make the function easily reusable.

```
let increaseAge = resolve.assign({
  age: (value) => value + 1
})

increaseAge({ age: 0 }).then(console.log)
// Output: { age: 1 }
```

The template can access the object as well.

```
let needsMaintenance = resolve.assign({
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

In case the original object should not be modified, use `then` instead of `assign`.

### Arrays

```
let array = resolve
  .filter('age')   // [ {age: 1}, {age: 2} ]
  .reverse()       // [ {age: 2}, {age: 1} ]
  .map(o => o.age) // [ 2, 1 ]
  .sort()          // [ 1, 2 ]
  .map({
    age: (...[,,a]) => a,
    valid: true
  })               // [ { age: 1, valid: true }, { age: 2, valid: true } ]
  .then(console.log)

array([{age: 0}, {age: 1}, {age: 2}])
```

It is possible to `map` objects as well (index = key).

## Advanced

Many advantages of this approach only become apparent when the mutator requires arguments that do not traverse through the promise chain.

```
let increaseAge = increment => resolve.assign({
  age: (value) => value + increment
})

promise.then(increaseAge(2)).then(console.log)
```

There is direct access to the `resolve` function as well. It can be called like `promise.then(resolve.then(fn))` to allow to work with a fulfilled like it is a promise. All other functions are built on that and support to be called directly on resolve like `resolve.mutate(fn).mutate(fn)` instead of `resolve.then(mutate(fn).then(mutate(fn)))`. The value resolve receives can be accessed later in the chain with `then2`. This works similarly to the argument of the mutator above but this time the argument is dynamic.
