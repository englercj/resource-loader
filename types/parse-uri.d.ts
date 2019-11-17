declare module 'parse-uri'
{
    interface ParsedUri
    {
        source?: string;
        protocol?: string;
        authority?: string;
        userInfo?: string;
        user?: string;
        password?: string;
        host?: string;
        port?: string;
        relative?: string;
        path?: string;
        directory?: string;
        file?: string;
        query?: string;
        anchor?: string;
    }

    interface Options
    {
        strictMode?: boolean;
    }

    function parseUri(uri: string, options?: Options): ParsedUri;
    export default parseUri;
}
