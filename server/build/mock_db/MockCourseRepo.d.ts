import { CourseRepo } from "../core/requirements/CourseRepo";
import { Course } from "../core/entities/Course";
export declare class MockCourseRepo implements CourseRepo {
    courses: Course[];
    constructor(initialCourses: Course[]);
    listCourses(): Promise<Course[]>;
    findCourseById(courseId: string): Promise<Course>;
}
