import { atom } from 'jotai';
import axios from 'axios';

// Define Course and Lesson interfaces
interface Lesson {
  id: string;
  name: string;
  duration: number;
  completed: boolean;
}

interface Course {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  coverImage: string;
  duration: number;
  started: boolean;
  bookmarked: boolean;
}

// Create atoms for courses and loading state
export const coursesAtom = atom<Course[]>([]);
export const isLoadingAtom = atom<boolean>(false);

// Create a derived atom to fetch and store data
export const fetchCoursesAtom = atom(null, async (get, set) => {
  set(isLoadingAtom, true); // Set loading state to true
  try {
    const response = await axios.get<Course[]>('http://localhost:3000/courses');
    set(coursesAtom, response.data);
  } catch (error) {
    console.error('Failed to fetch courses:', error);
  } finally {
    set(isLoadingAtom, false); // Reset loading state
  }
});
