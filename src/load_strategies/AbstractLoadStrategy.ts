import { Signal } from 'type-signals';
import { ResourceType } from '../resource_type';

export type OnErrorSignal = (errMessage: string) => void;
export type OnCompleteSignal = (type: ResourceType, data: any) => void;
export type OnProgressSignal = (percent: number) => void;

export interface ILoadConfig
{
    // The url for this resource, relative to the baseUrl of this loader.
    url: string;

    // String to use for crossOrigin properties on load elements.
    crossOrigin?: string;

    // The time to wait in milliseconds before considering the load a failure.
    timeout?: number;
}

export abstract class AbstractLoadStrategy<C extends ILoadConfig = ILoadConfig>
{
    /**
     * Dispatched when the resource fails to load.
     */
    readonly onError = new Signal<OnErrorSignal>();

    /**
     * Dispatched once this resource has loaded, if there was an error it will
     * be in the `error` property.
     */
    readonly onComplete = new Signal<OnCompleteSignal>();

    /**
     * Dispatched each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     */
    readonly onProgress = new Signal<OnProgressSignal>();

    constructor(readonly config: C)
    { }

    /**
     * Load the resource described by `config`.
     */
    abstract load(): void;

    /**
     * Abort the loading of the resource.
     */
    abstract abort(): void;
}

export type AbstractLoadStrategyCtor<C extends ILoadConfig = ILoadConfig> =
    new (config: C) => AbstractLoadStrategy<C>;
