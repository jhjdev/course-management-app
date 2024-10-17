import { CourseBookmark } from "../entities/CourseBookmark";
export interface BookmarkRepo {
    listBookmarkByUserId(userId: string): Promise<CourseBookmark[]>;
}
