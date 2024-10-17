import { atom } from 'jotai';

// Define an atom to track bookmarked status by course ID
export const bookmarkedCoursesAtom = atom<Record<string, boolean>>({});
