import { CourseRepo } from "../core/requirements/CourseRepo";
import { Course } from "../core/entities/Course";

export class MockCourseRepo implements CourseRepo {
  courses: Course[] = [];
  constructor(initialCourses: Course[]) {
    this.courses = initialCourses;
  }

  async listCourses(): Promise<Course[]> {
    return this.courses;
  }

  async findCourseById(courseId: string): Promise<Course> {
    const course = this.courses.find((course) => course.id === courseId);
    if (!course) throw new Error("Course not found");
    return course;
  }
}
