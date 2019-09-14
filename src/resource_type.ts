/**
 * Describes the type of data the Resource holds.
 */
export enum ResourceType
{
    /** The resource data type is unknown. */
    Unknown,
    /** The resource data is an ArrayBuffer. */
    Buffer,
    /** The resource data is a Blob. */
    Blob,
    /** The resource data is a parsed JSON Object. */
    Json,
    /** The resource data is a Document or <div/> element representing parsed XML. */
    Xml,
    /** The resource data is an <img/> element. */
    Image,
    /** The resource data is an <audio/> element. */
    Audio,
    /** The resource data is an <video/> element. */
    Video,
    /** The resource data is a string. */
    Text,
}

export enum ResourceState
{
    NotStarted,
    Loading,
    Complete,
}
