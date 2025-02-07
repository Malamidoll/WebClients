import type { MaybeNull } from '@proton/pass/types';

export const extractFirst = <K extends T, T>(arr: T[], condition: (entry: T) => boolean) =>
    arr.reduce<[MaybeNull<K>, T[]]>(
        (acc, entry) => {
            if (acc[0] === null && condition(entry)) acc[0] = entry as MaybeNull<K>;
            else acc[1].push(entry);
            return acc;
        },
        [null, []]
    );
