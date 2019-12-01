import { Signal } from 'type-signals';

/**
 * Ensures a function is only called once.
 *
 * @ignore
 * @typeparam R Return type of the function to wrap.
 * @param func The function to wrap.
 * @return The wrapping function.
 */
function onlyOnce<R>(func: (...args: any[]) => R): (...args: any[]) => R
{
    let fn: typeof func | null = func;

    return function onceWrapper(this: any, ...args: any[])
    {
        if (fn === null)
            throw new Error('Callback was already called.');

        const callFn = fn;
        fn = null;
        return callFn.apply(this, args);
    };
}

export type INext = (err?: Error) => void;
export type IWorker<T> = (item: T, next: INext) => void;
export type IItemCallback = (...args: any[]) => void;

export type OnDoneSignal = () => void;
export type OnSaturatedSignal = () => void;
export type OnUnsaturatedSignal = () => void;
export type OnEmptySignal = () => void;
export type OnDrainSignal = () => void;
export type OnErrorSignal<T> = (err: Error, data: T) => void;

interface ITask<T>
{
    data: T;
    callback?: IItemCallback;
}

/**
 * Async queue.
 *
 * @typeparam T Element type of the queue.
 * @param worker The worker function to call for each task.
 * @param concurrency How many workers to run in parrallel. Must be greater than 0.
 * @return The async queue object.
 */
export class AsyncQueue<T>
{
    private workers = 0;
    private buffer = 0;
    private paused = false;

    private _started = false;
    private _tasks: ITask<T>[] = [];

    readonly onSaturated: Signal<OnSaturatedSignal> = new Signal<OnSaturatedSignal>();
    readonly onUnsaturated: Signal<OnUnsaturatedSignal> = new Signal<OnUnsaturatedSignal>();
    readonly onEmpty: Signal<OnEmptySignal> = new Signal<OnEmptySignal>();
    readonly onDrain: Signal<OnDrainSignal> = new Signal<OnDrainSignal>();
    readonly onError: Signal<OnErrorSignal<T>> = new Signal<OnErrorSignal<T>>();

    constructor(readonly worker: IWorker<T>, public concurrency = 1)
    {
        if (concurrency === 0)
            throw new Error('Concurrency must not be zero');

        this.buffer = concurrency / 4;
    }

    get started() { return this._started; }

    reset()
    {
        this.onDrain.detachAll();
        this.workers = 0;
        this._started = false;
        this._tasks = [];
    }

    push(data: T, callback?: IItemCallback)
    {
        this._insert(data, false, callback);
    }

    unshift(data: T, callback?: IItemCallback)
    {
        this._insert(data, true, callback);
    }

    process()
    {
        while (!this.paused && this.workers < this.concurrency && this._tasks.length)
        {
            const task = this._tasks.shift()!;

            if (this._tasks.length === 0)
                this.onEmpty.dispatch();

            this.workers += 1;

            if (this.workers === this.concurrency)
                this.onSaturated.dispatch();

            this.worker(task.data, onlyOnce(this._next(task)));
        }
    }

    length()
    {
        return this._tasks.length;
    }

    running()
    {
        return this.workers;
    }

    idle()
    {
        return this._tasks.length + this.workers === 0;
    }

    pause()
    {
        if (this.paused === true)
            return;

        this.paused = true;
    }

    resume()
    {
        if (this.paused === false)
            return;

        this.paused = false;

        // Need to call this.process once per concurrent
        // worker to preserve full concurrency after pause
        for (let w = 1; w <= this.concurrency; w++)
        {
            this.process();
        }
    }

    getTask(index: number): ITask<T>
    {
        return this._tasks[index];
    }

    private _insert(data: T, insertAtFront: boolean, callback?: IItemCallback)
    {
        if (callback != null && typeof callback !== 'function')
        {
            throw new Error('task callback must be a function');
        }

        this._started = true;

        if (data == null && this.idle())
        {
            // call drain immediately if there are no tasks
            setTimeout(() => this.onDrain.dispatch(), 1);
            return;
        }

        const task: ITask<T> = { data, callback };

        if (insertAtFront)
            this._tasks.unshift(task);
        else
            this._tasks.push(task);

        setTimeout(() => this.process(), 1);
    }

    private _next(task: ITask<T>)
    {
        return (err?: Error, ...args: any[]) =>
        {
            this.workers -= 1;

            if (task.callback)
                task.callback(err, ...args);

            if (err)
                this.onError.dispatch(err, task.data);

            if (this.workers <= (this.concurrency - this.buffer))
                this.onUnsaturated.dispatch();

            if (this.idle())
                this.onDrain.dispatch();

            this.process();
        };
    }
}
