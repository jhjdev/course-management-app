import { BookmarkRepo } from "../../requirements/BookmarkRepo";
export declare class ListCourseBookmarksUsecase {
    private bookmarkRepo;
    constructor(bookmarkRepo: BookmarkRepo);
    exec: (userId: string) => Promise<import("../../entities/CourseBookmark").CourseBookmark[]>;
}
