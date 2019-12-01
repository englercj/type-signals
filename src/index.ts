export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U : never;
export type ReplaceReturnType<T, TNewReturn> = (...a: ArgumentTypes<T>) => TNewReturn;

export type WithBoolReturn<T> = ReplaceReturnType<T, boolean>;
export type WithVoidReturn<T> = ReplaceReturnType<T, void>;

export interface SignalBinding
{
    detach(): void;
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

    detach()
    {
        if (this.owner === null)
            return false;

        this.owner.detach(this);

        return true;
    }

    dispose()
    {
        this.detach();
    }
}

export class Signal<T extends Function>
{
    private _head: SignalBindingImpl<T> | null = null;
    private _tail: SignalBindingImpl<T> | null = null;

    private _filter: WithBoolReturn<T> | null = null;

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

    hasAny(): boolean
    {
        return !!this._head;
    }

    has(node: SignalBinding): boolean
    {
        return (node as SignalBindingImpl<T>).owner === this;
    }

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

    add(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addMiniSignalBinding(new SignalBindingImpl(fn, false, thisArg));
    }

    once(fn: WithVoidReturn<T>, thisArg: any = null): SignalBinding
    {
        return this._addMiniSignalBinding(new SignalBindingImpl(fn, true, thisArg));
    }

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

    filter(filter: WithBoolReturn<T>)
    {
        this._filter = filter;
    }

    proxy(...signals: Signal<T>[]): this
    {
        const fn = (...args: ArgumentTypes<T>) => this.dispatch(...args);

        for (let i = 0; i < signals.length; ++i)
        {
            signals[i].add(fn);
        }

        return this;
    }

    private _addMiniSignalBinding(node_: SignalBinding): SignalBinding
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
