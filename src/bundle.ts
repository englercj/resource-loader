import { AbstractLoadStrategy } from './load_strategies/AbstractLoadStrategy';
import { AudioLoadStrategy } from './load_strategies/AudioLoadStrategy';
import { ImageLoadStrategy } from './load_strategies/ImageLoadStrategy';
import { MediaElementLoadStrategy } from './load_strategies/MediaElementLoadStrategy';
import { VideoLoadStrategy } from './load_strategies/VideoLoadStrategy';
import { XhrLoadStrategy } from './load_strategies/XhrLoadStrategy';

import { Loader } from './Loader';
import { Resource } from './Resource';
import { ResourceType, ResourceState } from './resource_type';

// TODO: Hide this stuff and only expose for tests
import { AsyncQueue } from './async/AsyncQueue';
import { eachSeries } from './async/eachSeries';
import { getExtension } from './utilities';

Object.defineProperties(Loader, {
    AbstractLoadStrategy: { get() { return AbstractLoadStrategy; } },
    AudioLoadStrategy: { get() { return AudioLoadStrategy; } },
    ImageLoadStrategy: { get() { return ImageLoadStrategy; } },
    MediaElementLoadStrategy: { get() { return MediaElementLoadStrategy; } },
    VideoLoadStrategy: { get() { return VideoLoadStrategy; } },
    XhrLoadStrategy: { get() { return XhrLoadStrategy; } },

    Resource: { get() { return Resource; } },
    ResourceType: { get() { return ResourceType; } },
    ResourceState: { get() { return ResourceState; } },

    // TODO: Hide this stuff and only expose for tests
    async: { get() { return { AsyncQueue, eachSeries }; } },
    getExtension: { get() { return getExtension; } },
});

export default Loader;
