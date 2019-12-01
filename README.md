# Type Signals

Small and fast Signal library for Typescript.

Heavily inspired by [mini-signals](https://github.com/Hypercubed/mini-signals).

## Install

```
npm install type-signals
```

## Documentation

- https://englercj.github.io/type-signals/

## Example Usage

```ts
import { Signal } from 'type-signals';

type OnDoThingSignal = (foo: string, bar: string): void;
const mySignal = new Signal<OnDoThingSignal>();

const binding = mySignal.add(onSignal); // add listener
mySignal.dispatch('foo', 'bar');        // dispatch signal passing custom parameters
binding.detach();                       // remove a single listener

function onSignal(foo: string, bar: string)
{
    assert(foo === 'foo');
    assert(bar === 'bar');
}
```
