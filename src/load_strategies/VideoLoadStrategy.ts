import { MediaElementLoadStrategy, IMediaElementLoadConfig } from './MediaElementLoadStrategy';

export class VideoLoadStrategy extends MediaElementLoadStrategy
{
    constructor(config: IMediaElementLoadConfig)
    {
        super(config, 'video');
    }
}
