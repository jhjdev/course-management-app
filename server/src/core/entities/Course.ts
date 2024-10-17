import { Lesson } from "./Lesson";

export interface Course {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  coverImage: string;
}
