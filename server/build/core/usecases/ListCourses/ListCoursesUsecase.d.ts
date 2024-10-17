import { CourseRepo } from "../../requirements/CourseRepo";
export declare class ListCoursesUsecase {
    private courseRepo;
    constructor(courseRepo: CourseRepo);
    exec: () => Promise<{
        duration: number;
        id: string;
        name: string;
        description: string;
        lessons: import("../../entities/Lesson").Lesson[];
        coverImage: string;
    }[]>;
}
