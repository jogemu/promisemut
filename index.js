// A mutator is a function that receives the value a prior promise was fullfilled with.
// A mutator's return value/promise is discarded and replaced with the (modified) value.

const mapObject = fn => obj => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key, obj)]))
const zip = (...arrays) => arrays[0].map((_, i) => arrays.map(a => a[i]))

// promise.then(resolve.then(f0)...then(fn)) => promise.then(f0)...then(fn)
// NOTICE: additional functionality added at end of the file. 
const resolve = value => Promise.resolve(value)

// promise.then(map(fn)) => promise.then(array => array.map(fn))
//                       => promise.then(object => ({ key: fn(object[key], key, object) }))
const mapEntries = fn => source => Object.entries(source).map(([key, value]) => fn(value, key, source))
const fromEntries = (result, source) => Array.isArray(source) ? result : Object.fromEntries(zip(Object.keys(source), result))
const map = fn => resolve.then(mapEntries(fn)).then(a => Promise.all(a)).then2(fromEntries)

// object 2 function
const o2f = o => o instanceof Function ? o : 
                 o !== new Object(o) || o instanceof Date ? () => o : 
                 v => map(o2f)(o).then(map((fn, k) => fn(v ? v[k] : undefined, k, v)))

// promise.then(mutate(mutator)) => promise.then(value => { mutator(value); return value; })
const mutate = (...args) => resolve.then(...args).then2((_, v) => v)
//             mutator => value => resolve.then(mutator).then(() => value)

// promise.then(assign({ key: fn })) => promise.mutate(value => value[key] = fn(value[key], key, value))
const assign = (...args) => resolve.then(...args).then2((resolved, initial) => Object.assign(initial, resolved))

// promise.then(assign({ key: fn })) => promise.mutate(value => value[key] ??= fn(value[key], key, value))
const fallback = (...args) => resolve.then(...args).then2((resolved, initial) => Object.assign(resolved, initial))

// function or key
const fok = o => o instanceof Function ? o : v => v[o]

// accept i parameters, a resolve function that defaults to replace, and a reject handler
const extend = (target, i, m=v=>v) => mapObject((n, k) => (...args) => target.then(array => array[n ?? k](...m(args.slice(0, i))), ...args.slice(i + 1)).then2(args[i] ?? (v => v)))

const promise = target => Object.assign(target, {
  then: (...args) => promise(v => target(v).then(...args.slice(0, 1).map(o2f), ...args.slice(1))),
  then2: (fn, ...args) => promise(v => target(v).then(o => fn(o, v), ...args)),
  catch: fn => promise(v => target(v).catch(fn)),
  finally: fn => promise(v => target(v).finally(fn)),
}, mapObject(fn => (...args) => target.then(fn(...args.slice(0, 1)), ...args.slice(1)))({
  mutate,
  assign,
  fallback,
  map: o => map(o2f(o)),
  forEach: o => map(o2f(o)).then2((_, v) => v),
}), extend(target, 1, a => a.map(fok))({
  // 1 parameter, arg[0] is key or function, use then for thisArg
  filter: null,

  every: null,
  some: null,

  find: null,
  findIndex: null,
  findLast: null,
  findLastIndex: null,
}), extend(target, 0)({
  keys: null,
  values: null,
  entries: null,

  reverse: 'toReversed',

  pop: null,
  shift: null,

  toString: null,
}), extend(target, 1)({
  at: null,
  flat: null,
  join: null,
  sort: 'toSorted',
}), extend(target, 2)({
  reduce: null,
  reduceRight: null,
  flatMap: null,
  with: null,

  // optional second
  includes: null,
  indexOf: null,
  lastIndexOf: null,

  slice: null,
  toLocaleString: null,
}), extend(target, 3)({
  fill: null,
}), extend(target, 1, v => v[0])({
  push: null,
  unshift: null,
}), extend(target, 3, v => [...v.slice(0, 2), ...v.slice(2, 3).flat()])({
  splice: null,
  toSpliced: null,
}), {
  // resolve.setcln(setup, cleanup)(mutator) => resolve.then(value => { setup(value); mutator(value); cleanup(value); return value; })
  setcln: (setup, cleanup) => mutator => target.mutate(setup).mutate(mutator).mutate(cleanup)
})
promise(resolve)

export default resolve
