import { Subscription, Observable } from "rxjs";
import { View, view } from "./state";
import { switchMap } from "rxjs/operators";

export function effect(
  run: () => Observable<any>,
  deps?: never[]
): Subscription;
export function effect<V1>(
  run: (v1: V1) => Observable<any>,
  deps: [View<V1>]
): Subscription;
export function effect<V1, V2>(
  run: (v1: V1, v2: V2) => Observable<any>,
  deps: [View<V1>, View<V2>]
): Subscription;
export function effect<V1, V2, V3>(
  run: (v1: V1, v2: V2, v3: V3) => Observable<any>,
  deps: [View<V1>, View<V2>, View<V3>]
): Subscription;
export function effect<V1, V2, V3, V4>(
  run: (v1: V1, v2: V2, v3: V3, v4: V4) => Observable<any>,
  deps: [View<V1>, View<V2>, View<V3>, View<V4>]
): Subscription;
export function effect<V1, V2, V3, V4, V5>(
  run: (v1: V1, v2: V2, v3: V3, v4: V4, v5: V5) => Observable<any>,
  deps: [View<V1>, View<V2>, View<V3>, View<V4>, View<V5>]
): Subscription;
export function effect<V1, V2, V3, V4, V5, V6>(
  run: (v1: V1, v2: V2, v3: V3, v4: V4, v5: V5, v6: V6) => Observable<any>,
  deps: [View<V1>, View<V2>, View<V3>, View<V4>, View<V5>, View<V6>]
): Subscription;
export function effect<V1, V2, V3, V4, V5, V6, V7>(
  run: (
    v1: V1,
    v2: V2,
    v3: V3,
    v4: V4,
    v5: V5,
    v6: V6,
    v7: V7
  ) => Observable<any>,
  deps: [View<V1>, View<V2>, View<V3>, View<V4>, View<V5>, View<V6>, View<V7>]
): Subscription;
export function effect<V1, V2, V3, V4, V5, V6, V7, V8>(
  run: (
    v1: V1,
    v2: V2,
    v3: V3,
    v4: V4,
    v5: V5,
    v6: V6,
    v7: V7,
    v8: V8
  ) => Observable<any>,
  deps: [
    View<V1>,
    View<V2>,
    View<V3>,
    View<V4>,
    View<V5>,
    View<V6>,
    View<V7>,
    View<V8>
  ]
): Subscription;
export function effect(
  run: (...args: any[]) => Observable<any>,
  deps: View<any>[] = []
): Subscription {
  const composedView = (view as any)(
    ...deps,
    (...results: any[]) => results
  ) as View<any>;

  return composedView.pipe(switchMap(results => run(results))).subscribe();
}
