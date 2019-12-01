/** Helper to deduce the argument types of a function. */
export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U : never;

/** Helper to replace the return type of a function with a different value. */
export type ReplaceReturnType<T, TNewReturn> = (...a: ArgumentTypes<T>) => TNewReturn;

/** Helper to replace the return type of a function with `boolean`. */
export type WithBoolReturn<T> = ReplaceReturnType<T, boolean>;

/** Helper to replace the return type of a function with `void`. */
export type WithVoidReturn<T> = ReplaceReturnType<T, void>;

/**
 * Interface representing a single binding to the signal.
 * This can be used to detach the handler function from the owning signal
 * so that it will no longer receive events.
 */
export interface SignalBinding
{
    /** Detaches this binding from the owning signal. */
    detach(): boolean;

    /** Detaches this binding from the owning signal. */
    dispose(): void;
}

class SignalBindingImpl<T extends Function> implements SignalBinding
{
    readonly fn: WithVoidReturn<T>;
    readonly once: boolean;
    readonly thisArg: any;

    next: SignalBindingImpl<T> | null = null;
    prev: SignalBindingImpl<T> | null = null;
    owner: Signal<any> | null = null;

    constructor(fn: WithVoidReturn<T>, once = false, thisArg: any)
    {
        this.fn = fn;
        this.once = once;
        this.thisArg = thisArg;
    }

    detach(): boolean
    {
        if (this.owner === null)
            return false;

        this.owner.detach(this);

        return true;
    }

    dispose(): void
    {
        this.detach();
    }
}

/**
 * A signal is a dispatcher that can bind functions (handlers) to dispatched events.
 */
export class Signal<T extends Function = (() => void)>
{
    private _head: SignalBindingImpl<T> | null = null;
    private _tail: SignalBindingImpl<T> | null = null;

    private _filter: WithBoolReturn<T> | null = null;

    /**
     * Gathers a list of all the handlers currently bound to this signal.
     */
    handlers(): SignalBinding[]
    {
        let node = this._head;

        const handlers = [];
        while (node)
        {
            handlers.push(node);
            node = node.next;
        }

        return handlers;
    }

    /**
     * Returns true if this signal has any bound handlers.
     */
    hasAny(): boolean
    {
        return !!this._head;
    }

    /**
     * Returns true if the given binding is owned by this signal.
     *
     * @param node The binding to check.
     */
    has(node: SignalBinding): boolean
    {
        return (node as SignalBindingImpl<T>).owner === this;
    }

    /**
     * Dispatch an event to all handlers.
     * If a filter was set, only if it returns `true` will the event get dispatched.
     *
     * @param args The arguments to pass to the filter and handlers.
     * @returns True if the event was dispatched, false otherwise.
     */
    dispatch(...args: ArgumentTypes<T>): boolean
    {
        let node = this._head;

        if (!node)
            return false;

        if (this._filter && !this._filter(...args))
            return false;

        while (node)
        {
            if (node.once)
                this.detach(node);

            node.fn.apply(node.thisArg, args);
            node = node.next;
        }

        return true;
    }

    /**
     * Binds a new handler function to this signal that will be called for each dispatch.
     *
     * @param fn The handler function to bind.
     * @param thisArg Optional `this` argument to use when calling this handler
     */
    add(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addSignalBinding(new SignalBindingImpl(fn, false, thisArg));
    }

    /**
     * Binds a new handler function to this signal that will only be called once on the next dispatch.
     *
     * @param fn The handler function to bind.
     * @param thisArg Optional `this` argument to use when calling this handler.
     */
    once(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addSignalBinding(new SignalBindingImpl(fn, true, thisArg));
    }

    /**
     * Detaches a binding from this signal so that it is no longer called.
     *
     * @param node_ The binding to detach.
     */
    detach(node_: SignalBinding): this
    {
        const node = node_ as SignalBindingImpl<T>;

        if (node.owner !== this)
            return this;

        if (node.prev)
            node.prev.next = node.next;

        if (node.next)
            node.next.prev = node.prev;

        if (node === this._head)
        {
            this._head = node.next;

            if (node.next === null)
            {
                this._tail = null;
            }
        }
        else if (node === this._tail)
        {
            this._tail = node.prev;

            if (this._tail)
                this._tail.next = null;
        }

        node.owner = null;

        return this;
    }

    /**
     * Detaches all bindings.
     */
    detachAll()
    {
        let node = this._head;

        if (!node)
            return this;

        this._head = null;
        this._tail = null;

        while (node)
        {
            node.owner = null;
            node = node.next;
        }

        return this;
    }

    /**
     * Sets the filter function to be called on each dispatch. This function takes the same
     * parameters as a handler, but must return a boolean. Only when this function returns
     * `true` will an event dispatch actually call bound handlers.
     *
     * @param filter The function to use as the filter.
     */
    filter(filter: WithBoolReturn<T>)
    {
        this._filter = filter;
    }

    /**
     * Sets up a link between the passed signals and this one such that when the passed
     * signal is dispatched, this signal is also dispatched.
     *
     * @param signals The signals to proxy.
     */
    proxy(...signals: Signal<T>[]): this
    {
        const fn = (...args: ArgumentTypes<T>) => this.dispatch(...args);

        for (let i = 0; i < signals.length; ++i)
        {
            signals[i].add(fn);
        }

        return this;
    }

    private _addSignalBinding(node_: SignalBinding): SignalBinding
    {
        const node = node_ as SignalBindingImpl<T>;

        if (!this._head)
        {
            this._head = node;
            this._tail = node;
        }
        else
        {
            if (this._tail)
                this._tail.next = node;

            node.prev = this._tail;
            this._tail = node;
        }

        node.owner = this;

        return node;
    }
}
