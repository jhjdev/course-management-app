import { CourseRepo } from "../../requirements/CourseRepo";

export class ListCoursesUsecase {
  constructor(private courseRepo: CourseRepo) {}

  exec = async () => {
    const courses = await this.courseRepo.listCourses();

    const coursesWithDuration = courses.map((course) => {
      const duration = course.lessons.reduce(
        (acc, lesson) => acc + lesson.duration,
        0
      );
      return { ...course, duration };
    });

    return coursesWithDuration;
  };
}
