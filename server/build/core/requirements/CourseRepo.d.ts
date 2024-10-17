import { Course } from "../entities/Course";
export interface CourseRepo {
    findCourseById(courseId: string): Promise<Course | null>;
    listCourses(): Promise<Course[]>;
}
