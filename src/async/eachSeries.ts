/**
 * Iterates an array in series.
 *
 * @typeparam T Element type of the array.
 * @param array Array to iterate.
 * @param iterator Function to call for each element.
 * @param callback Function to call when done, or on error.
 * @param deferNext Break synchronous each loop by calling next with a setTimeout of 1.
 */
export function eachSeries<T>(
    array: T[],
    iterator: (item: T, next: (err?: Error) => void) => void,
    callback?: (err?: Error) => void,
    deferNext = false) : void
{
    let i = 0;
    const len = array.length;

    (function next(err?: Error)
    {
        if (err || i === len)
        {
            if (callback)
                callback(err);
            return;
        }

        if (deferNext)
            setTimeout(() => iterator(array[i++], next), 1);
        else
            iterator(array[i++], next);
    })();
}
