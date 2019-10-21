import { BehaviorSubject, Observable } from "rxjs";
import { map, distinctUntilChanged } from "rxjs/operators";

/**
 * Internal Symbols for holding State and Config
 */
export const __danger_internal_value = Symbol("internalValue");
export const __danger_internal_selector = Symbol("internalSelector");
export const __danger_internal_projectorFn = Symbol("internalProjectorFn");
export const __danger_internal_updateFn = Symbol("internalUpdateFn");
export const __danger_internal_comparer = Symbol("internalComparer");

/**
 * Common Types
 */
type Reducer<Value, Message> = (value: Value, message: Message) => Value;

type Comparer<V> = (a: V, b: V) => boolean;

type Scheduler = (fn: () => void) => void;

type SelectorFactory = (...inputsAndProjector: any[]) => () => any;

type NotAFunction<T> = T extends Function
  ? "Functions cannot be used as values. Use 'derived' instead of 'value' for functions."
  : T;

type ValueOrFactory<T> = T | ((last: T) => T);

export interface View<T> extends Observable<T> {
  [__danger_internal_selector]: () => T;
  [__danger_internal_projectorFn]: (...args: any[]) => T;
}

export interface DerivedValue<T, L> extends View<T> {
  [__danger_internal_value]: T;
  [__danger_internal_updateFn]: Reducer<T, L>;
  [__danger_internal_comparer]: Comparer<T>;
}

export interface Value<T> extends DerivedValue<T, ValueOrFactory<T>> {}

/**
 * Scheduler used to emit a signal that values in the data graph
 * have been updated. Defaults to requestAnimationFrame for the
 * browser.
 */
let scheduler: Scheduler = requestAnimationFrame;
export function setScheduler(newScheduler: Scheduler) {
  scheduler = newScheduler;
}

/**
 * Observable that indicates some value in the data graph
 * has been updated
 */
const signal$ = new BehaviorSubject<true>(true);

let isUpdateScheduled: boolean = false;
export function __danger_internal_scheduleUpdate() {
  if (isUpdateScheduled) return;

  isUpdateScheduled = true;
  scheduler(() => {
    signal$.next(true);
    isUpdateScheduled = false;
  });
}

/**
 * Library ships in dev mode by default.
 */
let isProdMode: boolean = false;
export function enableProdMode() {
  isProdMode = true;
}

/**
 * Implementation of a deep freeze algorithm
 */
function freezeProp(propValue: any) {
  if (
    (isObjectLike(propValue) || isFunction(propValue)) &&
    !Object.isFrozen(propValue)
  ) {
    freeze(propValue);
  }
}

function checkFnProp(this: any, prop: string) {
  if (
    hasOwnProperty(this, prop) &&
    prop !== "caller" &&
    prop !== "callee" &&
    prop !== "arguments"
  ) {
    freezeProp(this[prop]);
  }
}

function checkProp(this: any, prop: string) {
  if (hasOwnProperty(this, prop)) {
    freezeProp(this[prop]);
  }
}

export function freeze(target: any) {
  Object.freeze(target);

  const targetIsFunction = isFunction(target);

  Object.getOwnPropertyNames(target).forEach(
    targetIsFunction ? checkFnProp : checkProp,
    target
  );

  return target;
}

/**
 * In development all state held in the data graph is frozen to enforce
 * building applications with immutability.
 */
const isMinified = /param/.test(function(param: any) {}.toString());
let hasWarnedAboutTurningOffDevModeInProd = false;

function freezeIfInDevMode(target: any) {
  if (!isProdMode && isMinified && !hasWarnedAboutTurningOffDevModeInProd) {
    console.warn(
      "signal-state is running in dev mode but it appears the app is has been " +
        'minified. If this is the case, import "enableProdMode" from signal-state ' +
        "and call it to improve performance in your production app."
    );

    hasWarnedAboutTurningOffDevModeInProd = true;
  }

  isProdMode || freeze(target);
}

/**
 * Used to check equality between two values
 */
const defaultComparer: Comparer<any> = (a, b) => a === b;

/**
 * Creates a view into a piece of data
 */
function makeView<V>(
  selector: () => V,
  projector: (...args: any[]) => V
): View<V>;
function makeView<V, L extends object>(
  selector: () => V,
  projector: (...args: any[]) => V,
  other: L
): View<V> & L;
function makeView<V>(
  selector: () => V,
  projector: (...args: any[]) => V,
  other = {}
): View<V> {
  return Object.assign(
    signal$.pipe(
      map(selector),
      distinctUntilChanged()
    ),
    {
      [__danger_internal_selector]: selector,
      [__danger_internal_projectorFn]: projector
    },
    other
  );
}

/**
 * Basic unit of state. Uses a reducer to handle changes to the value.
 */
export function derived<V, M>(
  reducer: Reducer<V, M>,
  initialValue: V,
  comparer: Comparer<V> = defaultComparer
): DerivedValue<V, M> {
  let value$: DerivedValue<V, M>;
  const selector = (): V => value$[__danger_internal_value];

  value$ = makeView(selector, selector, {
    [__danger_internal_comparer]: comparer,
    [__danger_internal_value]: initialValue,
    [__danger_internal_updateFn]: reducer
  });

  freezeIfInDevMode(initialValue);

  return value$;
}

/**
 * Value is an easier to consume state source than derived. Simply
 * pass it a value instead of a full reducer. Uses derived under
 * the hood.
 */
const valueReducer: Reducer<any, any> = function(lastValue, nextValueOrFn) {
  if (typeof nextValueOrFn === "function") {
    return nextValueOrFn(lastValue);
  }

  return nextValueOrFn;
};
export function value<T>(
  initialValue: NotAFunction<T>,
  comparer?: Comparer<NotAFunction<T>>
): Value<NotAFunction<T>> {
  return derived<NotAFunction<T>, ValueOrFactory<NotAFunction<T>>>(
    valueReducer,
    initialValue,
    comparer
  );
}

export function dispatch<V, M>(value$: DerivedValue<V, M>, message: M): void {
  const comparer = value$[__danger_internal_comparer];
  const currentValue = value$[__danger_internal_value];
  const nextValue = value$[__danger_internal_updateFn](currentValue, message);

  if (comparer(currentValue, nextValue)) return;

  value$[__danger_internal_value] = nextValue;
  freezeIfInDevMode(nextValue);
  __danger_internal_scheduleUpdate();
}

export function update<T>(
  value$: Value<T>,
  nextValueFn: (lastValue: T) => T
): void;
export function update<T>(value$: Value<T>, nextValue: T): void;
export function update<T>(
  value$: Value<T>,
  nextValueOrFn: ValueOrFactory<T>
): void {
  dispatch(value$, nextValueOrFn);
}

/**
 * Simple memoized selector implementation that doesn't rely on a
 * state object
 */
const selectorFactories = new WeakMap<Comparer<any>, SelectorFactory>();
function createSelectorFactory(comparer: Comparer<any>): SelectorFactory {
  if (selectorFactories.has(comparer)) return selectorFactories.get(comparer)!;

  const createSelector = function(...inputsAndProjector: any[]) {
    const inputs: (() => any)[] = inputsAndProjector.slice(-1);
    const projector: (...arsg: any[]) => any = inputsAndProjector[0];

    let lastArgs: any[] | null = null;
    let lastResult: any | undefined = undefined;

    return function() {
      const newArgs = inputs.map(input => input());

      if (
        lastArgs !== null &&
        lastArgs.length === newArgs.length &&
        !newArgs.some((arg, index) => !comparer(arg, lastArgs![index]))
      ) {
        lastArgs = newArgs;

        return lastResult;
      }

      const nextResult = projector.apply(undefined, newArgs);

      if (!comparer(lastResult, nextResult)) {
        lastResult = nextResult;
      }

      return lastResult;
    };
  };

  selectorFactories.set(comparer, createSelector);

  return createSelector;
}

export function view<V1>(v1: View<V1>): View<V1>;
export function view<V1, R>(
  v1: View<V1>,
  projector: (v1: V1) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, R>(
  v1: View<V1>,
  v2: View<V2>,
  projector: (v1: V1, v2: V2) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  projector: (v1: V1, v2: V2, v3: V3) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, V4, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  v4: View<V4>,
  projector: (v1: V1, v2: V2, v3: V3, v4: V4) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, V4, V5, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  v4: View<V4>,
  v5: View<V5>,
  projector: (v1: V1, v2: V2, v3: V3, v4: V4, v5: V5) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, V4, V5, V6, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  v4: View<V4>,
  v5: View<V5>,
  v6: View<V6>,
  projector: (v1: V1, v2: V2, v3: V3, v4: V4, v5: V5, v6: V6) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, V4, V5, V6, V7, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  v4: View<V4>,
  v5: View<V5>,
  v6: View<V6>,
  v7: View<V7>,
  projector: (v1: V1, v2: V2, v3: V3, v4: V4, v5: V5, v6: V6, v7: V7) => R,
  comparer?: Comparer<any>
): View<R>;
export function view<V1, V2, V3, V4, V5, V6, V7, V8, R>(
  v1: View<V1>,
  v2: View<V2>,
  v3: View<V3>,
  v4: View<V4>,
  v5: View<V5>,
  v6: View<V6>,
  v7: View<V7>,
  v8: View<V8>,
  projector: (
    v1: V1,
    v2: V2,
    v3: V3,
    v4: V4,
    v5: V5,
    v6: V6,
    v7: V7,
    v8: V8
  ) => R,
  comparer?: Comparer<any>
): View<R>;
export function view(...args: any[]): View<any> {
  if (args.length === 1) {
    return makeView(
      args[0][__danger_internal_selector],
      args[0][__danger_internal_selector]
    );
  }

  const views: View<any>[] = args.slice(-2);
  let projector: (...args: any[]) => any = args[args.length - 2];
  let comparer: Comparer<any> = args[args.length - 1];

  if (typeof projector !== "function") {
    views.push(projector);
    projector = comparer;
    comparer = defaultComparer;
  }

  const selectors = views.map(view$ => view$[__danger_internal_selector]);
  const selector = createSelectorFactory(comparer).call(
    undefined,
    ...selectors,
    (...args: any[]) => {
      const result = projector.apply(undefined, args);

      freezeIfInDevMode(result);

      return result;
    }
  );

  return makeView(selector, projector);
}

/**
 * Utility Functions
 */
function isObjectLike(target: any): target is object {
  return typeof target === "object" && target !== null;
}

function isFunction(target: any): target is Function {
  return typeof target === "function";
}

function hasOwnProperty(target: object, propertyName: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, propertyName);
}
