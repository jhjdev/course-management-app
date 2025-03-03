import { Types } from 'mongoose';
import { Bookmark } from '../models/Bookmark';

/**
* Interface for bookmark creation/update payload
*/
interface BookmarkData {
courseId: Types.ObjectId;
userId: Types.ObjectId;
tags?: string[];
notes?: string;
}

/**
* Interface for bookmark filter options
*/
interface BookmarkFilter {
tag?: string;
searchTerm?: string;
startDate?: Date;
endDate?: Date;
}

/**
* Interface for pagination options
*/
interface PaginationOptions {
page?: number;
limit?: number;
sortBy?: string;
sortOrder?: 'asc' | 'desc';
}

/**
* Interface for bookmark statistics
*/
interface BookmarkStats {
totalBookmarks: number;
bookmarksByTag: Record<string, number>;
recentBookmarks: number;
}

/**
* Service for managing course bookmarks
* @remarks
* Recommended MongoDB indexes:
* - { userId: 1, courseId: 1 } (unique compound index)
* - { userId: 1, createdAt: -1 } (for efficient user bookmark listing)
* - { tags: 1 } (for tag-based queries)
*/
class BookmarkService {
private static instance: BookmarkService;

private constructor() {}

public static getInstance(): BookmarkService {
    if (!BookmarkService.instance) {
    BookmarkService.instance = new BookmarkService();
    }
    return BookmarkService.instance;
}

/**
* Creates a new bookmark
* @param data - Bookmark creation data
* @throws {Error} If bookmark already exists or invalid data
*/
public async createBookmark(data: BookmarkData): Promise<Bookmark> {
    try {
    const existingBookmark = await Bookmark.findOne({
        userId: data.userId,
        courseId: data.courseId,
    });

    if (existingBookmark) {
        throw new Error('Bookmark already exists for this course');
    }

    const bookmark = new Bookmark({
        userId: data.userId,
        courseId: data.courseId,
        tags: data.tags || [],
        notes: data.notes,
    });

    return await bookmark.save();
    } catch (error) {
    throw new Error(`Failed to create bookmark: ${error.message}`);
    }
}

/**
* Updates an existing bookmark
* @param bookmarkId - ID of the bookmark to update
* @param data - Updated bookmark data
* @throws {Error} If bookmark not found or update fails
*/
public async updateBookmark(bookmarkId: Types.ObjectId, data: Partial<BookmarkData>): Promise<Bookmark> {
    try {
    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
        throw new Error('Bookmark not found');
    }

    if (data.tags) bookmark.tags = data.tags;
    if (data.notes !== undefined) bookmark.notes = data.notes;

    return await bookmark.save();
    } catch (error) {
    throw new Error(`Failed to update bookmark: ${error.message}`);
    }
}

/**
* Deletes a bookmark
* @param bookmarkId - ID of the bookmark to delete
* @param userId - ID of the user making the request
* @throws {Error} If bookmark not found or deletion fails
*/
public async deleteBookmark(bookmarkId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    try {
    const result = await Bookmark.deleteOne({ _id: bookmarkId, userId });
    if (result.deletedCount === 0) {
        throw new Error('Bookmark not found or unauthorized');
    }
    } catch (error) {
    throw new Error(`Failed to delete bookmark: ${error.message}`);
    }
}

/**
* Lists bookmarks for a user with filtering and pagination
* @param userId - ID of the user
* @param filter - Filter options
* @param pagination - Pagination options
*/
public async listBookmarks(
    userId: Types.ObjectId,
    filter?: BookmarkFilter,
    pagination?: PaginationOptions
): Promise<{ bookmarks: Bookmark[]; total: number }> {
    try {
    const query = { userId };
    if (filter?.tag) {
        query['tags'] = filter.tag;
    }
    if (filter?.searchTerm) {
        query['notes'] = { $regex: filter.searchTerm, $options: 'i' };
    }
    if (filter?.startDate || filter?.endDate) {
        query['createdAt'] = {};
        if (filter.startDate) query['createdAt']['$gte'] = filter.startDate;
        if (filter.endDate) query['createdAt']['$lte'] = filter.endDate;
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const sortOptions = {
        [pagination?.sortBy || 'createdAt']: pagination?.sortOrder === 'asc' ? 1 : -1,
    };

    const [bookmarks, total] = await Promise.all([
        Bookmark.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('courseId', 'title description'),
        Bookmark.countDocuments(query),
    ]);

    return { bookmarks, total };
    } catch (error) {
    throw new Error(`Failed to list bookmarks: ${error.message}`);
    }
}

/**
* Adds or removes tags from a bookmark
* @param bookmarkId - ID of the bookmark
* @param tags - Tags to add or remove
* @param operation - 'add' or 'remove'
*/
public async updateTags(
    bookmarkId: Types.ObjectId,
    tags: string[],
    operation: 'add' | 'remove'
): Promise<Bookmark> {
    try {
    const bookmark = await Bookmark.findById(bookmarkId);
    if (!bookmark) {
        throw new Error('Bookmark not found');
    }

    if (operation === 'add') {
        bookmark.tags = [...new Set([...bookmark.tags, ...tags])];
    } else {
        bookmark.tags = bookmark.tags.filter(tag => !tags.includes(tag));
    }

    return await bookmark.save();
    } catch (error) {
    throw new Error(`Failed to update tags: ${error.message}`);
    }
}

/**
* Checks if a course is bookmarked by a user
* @param userId - ID of the user
* @param courseId - ID of the course
*/
public async isBookmarked(userId: Types.ObjectId, courseId: Types.ObjectId): Promise<boolean> {
    try {
    const bookmark = await Bookmark.findOne({ userId, courseId });
    return !!bookmark;
    } catch (error) {
    throw new Error(`Failed to check bookmark status: ${error.message}`);
    }
}

/**
* Gets bookmark statistics for a user
* @param userId - ID of the user
*/
public async getBookmarkStats(userId: Types.ObjectId): Promise<BookmarkStats> {
    try {
    const [totalBookmarks, bookmarksByTag, recentBookmarks] = await Promise.all([
        Bookmark.countDocuments({ userId }),
        Bookmark.aggregate([
        { $match: { userId } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        ]),
        Bookmark.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
    ]);

    const tagStats = Object.fromEntries(
        bookmarksByTag.map(item => [item._id, item.count])
    );

    return {
        totalBookmarks,
        bookmarksByTag: tagStats,
        recentBookmarks,
    };
    } catch (error) {
    throw new Error(`Failed to get bookmark statistics: ${error.message}`);
    }
}
}

export default BookmarkService;

