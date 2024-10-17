import { BookmarkRepo } from "../../requirements/BookmarkRepo";

export class ListCourseBookmarksUsecase {
  constructor(private bookmarkRepo: BookmarkRepo) {}

  exec = async (userId: string) => {
    const bookmarks = await this.bookmarkRepo.listBookmarkByUserId(userId);
    return bookmarks;
  };
}
