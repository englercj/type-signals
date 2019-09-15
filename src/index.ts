export interface INodeEventEmitter
{
    on(event: string | symbol, listener: Function): this;
    removeListener(event: string | symbol, listener: Function): this;
}

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U : never;
export type ReplaceReturnType<T, TNewReturn> = (...a: ArgumentTypes<T>) => TNewReturn;

export type SignalFilterFn<T> = ReplaceReturnType<T, boolean>;
export type SignalCallbackFn<T> = ReplaceReturnType<T, void>;

export class SignalBinding<T extends Function>
{
    readonly fn: SignalCallbackFn<T>;
    readonly once: boolean;
    readonly thisArg: any;

    next: SignalBinding<T> | null = null;
    prev: SignalBinding<T> | null = null;
    owner: Signal<any> | null = null;

    constructor(fn: SignalCallbackFn<T>, once = false, thisArg: any)
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
    private _head: SignalBinding<T> | null = null;
    private _tail: SignalBinding<T> | null = null;

    private _filter: SignalFilterFn<T> | null = null;

    handlers(): SignalBinding<T>[]
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

    has(node: SignalBinding<T>): boolean
    {
        return node.owner === this;
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

    add(fn: SignalCallbackFn<T>, thisArg: any = null): SignalBinding<T>
    {
        return this._addMiniSignalBinding(new SignalBinding(fn, false, thisArg));
    }

    once(fn: SignalCallbackFn<T>, thisArg: any = null): SignalBinding<T>
    {
        return this._addMiniSignalBinding(new SignalBinding(fn, true, thisArg));
    }

    detach(node: SignalBinding<T>): this
    {
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

    filter(filter: SignalFilterFn<T>)
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

    private _addMiniSignalBinding(node: SignalBinding<T>): SignalBinding<T>
    {
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
