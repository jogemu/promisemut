// A mutator is a function that receives the value a prior promise was fullfilled with.
// A mutator's return value/promise is discarded and replaced with the (modified) value.

// f0, f1, ..., fn are function passed as a paramter

const mapObject = fn => obj => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key, obj)]))
const zip = (...arrays) => arrays[0].map((_, i) => arrays.map(a => a[i]))
const assignTo = result => obj => Object.assign(result, obj)

// promise.then(resolve.then(f0)...then(fn)) => promise.then(f0)...then(fn)
export const resolve = value => Promise.resolve(value) // will be thenAble 

// promise.then(mutate(mutator)) => promise.then(value => { mutator(value); return value; })
export const mutate = mutator => resolve.then(mutator).then2(value => () => value)
//                    mutator => value => Promise.resolve(mutator(value)).then(() => value)

// promise.then(map(fn)) => promise.then(array => array.map(fn))
//                       => promise.then(object => ... object[key] = fn(object[key], key, object) ...)
const mapEntries = fn => source => Object.entries(source).map(([key, value]) => fn(value, key, source))
const fromEntries = source => result => Array.isArray(source) ? result : Object.fromEntries(zip(Object.keys(source), result))
export const map = fn => resolve.then(mapEntries(fn)).then(a => Promise.all(a)).then2(fromEntries)


// The values of a template are functions that receive the fullfill value (or parts of it).
// A template is applied on fullfilled by calling each function similar to map fullfilled.

// replace fullfill value with template applied on fullfilled properties
export const replace = template => resolve.then(value => map((fn, key) => fn(value[key], key, value))(template))

// replace fullfill value with template applied on fullfilled only properties
export const replace1 = template => replace(mapObject(fn => v => fn(v))(template))

// replace fullfill value with template applied on fullfilled itself
export const replace3 = template => replace(mapObject(fn => (v, i, a) => fn(a))(template))

// update fullfill value with template applied on fullfilled properties
export const update = template => resolve.then(replace(template)).then2(assignTo)

// update fullfill value with template applied on fullfilled only properties
export const update1 = template => update(mapObject(fn => v => fn(v))(template))

// update fullfill value with template applied on fullfilled itself
export const update3 = template => update(mapObject(fn => (v, i, a) => fn(a))(template))


// mutation of promised array

// promise.then(filter('property')) => promise.then(array => array.filter(o => o['property']))
// promise.then(filter(fn        )) => promise.then(array => array.filter(fn))
export const filter = fn => resolve.then(array => array.filter(typeof fn == 'string' ? o => o[fn] : fn))

// promise.then(sort(fn)) => promise.then(array => array.sort(fn))
export const sort = fn => resolve.then(array => array.sort(fn))

// promise.then(push2result(fn)) => promise.then(array => { let result = []; array.forEach(fn(result)); return result; })
export const push2result = fn => resolve
  .then(() => [])
  .then2(array => mutate(result => array.forEach(fn(result))))


// return function remembers if it was called
const called = fn => fn.memory = () => (fn.memory.called = true) ? fn() : null
const constant = value => () => value
const callif = fn => condition => (condition ? fn : () => null)()

// recursion step
const step = (mutator, array, i = 0) => Promise.resolve(
  i < array.length && !array.resolve.called
).then(callif(() =>
  Promise.resolve(!array.excluded.has(array[i]))
  .then(callif(() => mutator(array[i], i, array)))
  .then(() => step(mutator, array, i + 1))
))

// promise.then(mutateEach(fn)) => promise.then(array => ... fn(element, index, array) ...).then(filter(...))
export const mutateEach = mutator => thenAble((array, i = 0, excluded = new Set()) => resolve
  // do not replace excluded/remove if already handled in parent loop
  .then(() => array.excluded ||= excluded)
  .then(() => array.remove ||= o => excluded.add(o))

  // resolve returns the parent loop's resolve. It is possible to resolve all nested loops.
  .then(() => array.resolve = called(constant(array.resolve)))

  // recursively mutate  through array until resolved or end reached. Removed elements are skipped.
  .then(() => step(mutator, array, i))

  // go back to parent loop's resolve or unset
  .then(() => (array.resolve = array.resolve()) || delete array.resolve)

  // if excluded different than parent handles delete
  .then(() => array.excluded == excluded && delete array.excluded && delete array.remove)
  // don't filter if empty (always if parent handles)
  .then(() => excluded.size ? array.filter(o => !excluded.has(o)) : array)
(array))

// promise.then(mutatePairs(fn)) => promise.then(array => ... fn(element, index, array) ...).then(filter(...))
export const mutatePairs = mutator => mutateEach((start, i, a) => mutateEach(end => mutator(start, end, a))(a, i + 1))



export const log = () => mutate(console.log)

const thenAble = target => Object.assign(target, mapObject(fn => thenfn => fn(thenfn, target))(thenAble.fns))
thenAble.fns = Object.assign({
  then: (fn, hist) => thenAble(v => hist(v).then(fn)),
  then2: (fn, hist) => thenAble(v => hist(v).then(fn(v))),
}, mapObject(f => (fn, hist) => thenAble(v => hist(v).then(f(fn))))({
  mutate, map, replace, update, replace1, update1, replace3, update3,
  filter, sort, push2result, mutateEach, mutatePairs,
  log,
}))
thenAble(resolve)

// directly accesses resolve, won't support that wasn't added before

// thenChain(fns)(promise) => promise.then(fns[0])...then(fns[n])
// const thenChain = fns => promise => fns.length ? thenChain(fns.slice(1))(promise.then(fns[0])) : promise