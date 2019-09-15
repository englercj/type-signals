import { Signal, SignalBinding } from './index';

Object.defineProperties(Signal, {
    SignalBinding: { get() { return SignalBinding; } },
});

export default Signal;
