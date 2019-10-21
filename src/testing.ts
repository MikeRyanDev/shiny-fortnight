import {
  __danger_internal_selector,
  __danger_internal_projectorFn,
  __danger_internal_updateFn,
  __danger_internal_comparer,
  __danger_internal_scheduleUpdate,
  DerivedValue,
  View
} from "./state";

export function getValue<T>(view$: View<T>): T {
  return view$[__danger_internal_selector]();
}

export function getProjectorFn<T>(view$: View<T>): (...args: any[]) => T {
  return view$[__danger_internal_projectorFn];
}

export function getComparer<T>(value$: DerivedValue<T, any>) {
  return value$[__danger_internal_comparer];
}

export function overrideValue<T>(view$: View<T>, value: T) {
  view$[__danger_internal_selector] = () => value;

  __danger_internal_scheduleUpdate();
}

export function spyOnDispatcher<M>(
  value$: DerivedValue<any, M>,
  spy: (message: M) => void
) {
  const originalUpdateFn = value$[__danger_internal_updateFn];

  value$[__danger_internal_updateFn] = function(value: any, message: M) {
    spy(message);

    return originalUpdateFn(value, message);
  };
}
