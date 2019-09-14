export interface INodeEventEmitter
{
    on(event: string | symbol, listener: Function): this;
    removeListener(event: string | symbol, listener: Function): this;
}

export type SignalFilterFn<Args extends any[]> = (...args: Args) => boolean;
export type SignalCallbackFn<Args extends any[]> = (...args: Args) => void;

export class SignalBinding<Args extends any[]>
{
    readonly fn: SignalCallbackFn<Args>;
    readonly once: boolean;
    readonly thisArg: any;

    next: SignalBinding<Args> | null = null;
    prev: SignalBinding<Args> | null = null;
    owner: Signal<any> | null = null;

    constructor(fn: SignalCallbackFn<Args>, once = false, thisArg: any)
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

export class Signal<Args extends any[] = any[]>
{
    private _head: SignalBinding<Args> | null = null;
    private _tail: SignalBinding<Args> | null = null;

    private _filter: SignalFilterFn<Args> | null = null;

    handlers(): SignalBinding<Args>[]
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

    has(node: SignalBinding<Args>): boolean
    {
        return node.owner === this;
    }

    dispatch(...args: Args): boolean
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

    add(fn: SignalCallbackFn<Args>, thisArg: any = null): SignalBinding<Args>
    {
        return this._addMiniSignalBinding(new SignalBinding(fn, false, thisArg));
    }

    once(fn: SignalCallbackFn<Args>, thisArg: any = null): SignalBinding<Args>
    {
        return this._addMiniSignalBinding(new SignalBinding(fn, true, thisArg));
    }

    detach(node: SignalBinding<Args>): this
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

    filter(filter: SignalFilterFn<Args>)
    {
        this._filter = filter;
    }

    proxy(...signals: Signal<Args>[]): this
    {
        const fn = (...args: Args) => this.dispatch(...args);

        for (let i = 0; i < signals.length; ++i)
        {
            signals[i].add(fn);
        }

        return this;
    }

    private _addMiniSignalBinding (node: SignalBinding<Args>): SignalBinding<Args>
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
