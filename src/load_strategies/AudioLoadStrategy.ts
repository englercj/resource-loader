import { MediaElementLoadStrategy, IMediaElementLoadConfig } from './MediaElementLoadStrategy';

export class AudioLoadStrategy extends MediaElementLoadStrategy
{
    constructor(config: IMediaElementLoadConfig)
    {
        super(config, 'audio');
    }
}
