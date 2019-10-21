# signal-state

## A Better BehaviorSubject for State Management

1. Define a value:

```ts
const name$ = value("Mike");
```

2. Update the value:

```ts
update(name$, "Mike Ryan");
```

3. Observe the value:

```ts
name$.subscribe(name => {});
```

4. Define a value with a reducer:

```ts
const count$ = derived((count, op: "inc" | "dec") => {
  switch (op) {
    case "inc":
      return count + 1;
    case "dec":
      return count - 1;
  }
}, 0);

dispatch(count$, "inc");
```

5. Create views into data:

```ts
const nameAndNumber$ = view(
  name$,
  count$,
  (name, count) => `${count}. ${name}`
);
```

6. Synchronize state to your backend

```ts
effect(
  nameAndNumber => {
    return this.httpClient.post(`/api/v1/name`, { name: nameAndNumber });
  },
  [nameAndNumber$]
);
```
