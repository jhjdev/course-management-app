import { Types } from 'mongoose';
import { UserGroup } from '../models/UserGroup';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { PaginationParams, PaginatedResponse } from '../types/common';

interface CreateGroupDto {
name: string;
description?: string;
adminIds?: Types.ObjectId[];
userIds?: Types.ObjectId[];
courseIds?: Types.ObjectId[];
}

interface UpdateGroupDto {
name?: string;
description?: string;
}

export class UserGroupService {
private static instance: UserGroupService;

private constructor() {}

public static getInstance(): UserGroupService {
    if (!UserGroupService.instance) {
    UserGroupService.instance = new UserGroupService();
    }
    return UserGroupService.instance;
}

/**
* Creates a new user group
* @param groupData Group creation data
* @returns Newly created group
* @throws {ValidationError} If required fields are missing
* @throws {DatabaseError} If database operation fails
*/
async createGroup(groupData: CreateGroupDto): Promise<UserGroup> {
    try {
    const group = new UserGroup({
        name: groupData.name,
        description: groupData.description,
        admins: groupData.adminIds || [],
        users: groupData.userIds || [],
        courses: groupData.courseIds || [],
    });

    await group.save();
    return group;
    } catch (error) {
    if (error.name === 'ValidationError') {
        throw new ValidationError('Invalid group data');
    }
    throw new DatabaseError('Failed to create group');
    }
}

/**
* Retrieves a group by ID with populated users and courses
* @param groupId Group ID
* @returns Populated group document
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async getGroupById(groupId: Types.ObjectId): Promise<UserGroup> {
    try {
    const group = await UserGroup.findById(groupId)
        .populate('users', 'name email')
        .populate('admins', 'name email')
        .populate('courses', 'title description');

    if (!group) {
        throw new NotFoundError('Group not found');
    }

    return group;
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to retrieve group');
    }
}

/**
* Lists all groups with pagination
* @param params Pagination parameters
* @returns Paginated list of groups
* @throws {DatabaseError} If database operation fails
*/
async listGroups(params: PaginationParams): Promise<PaginatedResponse<UserGroup>> {
    try {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
        UserGroup.find()
        .skip(skip)
        .limit(limit)
        .populate('admins', 'name email'),
        UserGroup.countDocuments(),
    ]);

    return {
        items: groups,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
    };
    } catch (error) {
    throw new DatabaseError('Failed to list groups');
    }
}

/**
* Adds users to a group
* @param groupId Group ID
* @param userIds User IDs to add
* @throws {NotFoundError} If group is not found
* @throws {ValidationError} If user IDs are invalid
* @throws {DatabaseError} If database operation fails
*/
async addUsers(groupId: Types.ObjectId, userIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.users.push(...userIds);
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error.name === 'ValidationError') {
        throw new ValidationError('Invalid user IDs');
    }
    throw new DatabaseError('Failed to add users to group');
    }
}

/**
* Removes users from a group
* @param groupId Group ID
* @param userIds User IDs to remove
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async removeUsers(groupId: Types.ObjectId, userIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.users = group.users.filter(id => !userIds.includes(id));
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to remove users from group');
    }
}

/**
* Adds administrators to a group
* @param groupId Group ID
* @param adminIds Admin user IDs to add
* @throws {NotFoundError} If group is not found
* @throws {ValidationError} If admin IDs are invalid
* @throws {DatabaseError} If database operation fails
*/
async addAdmins(groupId: Types.ObjectId, adminIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.admins.push(...adminIds);
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error.name === 'ValidationError') {
        throw new ValidationError('Invalid admin IDs');
    }
    throw new DatabaseError('Failed to add admins to group');
    }
}

/**
* Removes administrators from a group
* @param groupId Group ID
* @param adminIds Admin user IDs to remove
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async removeAdmins(groupId: Types.ObjectId, adminIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.admins = group.admins.filter(id => !adminIds.includes(id));
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to remove admins from group');
    }
}

/**
* Adds courses to a group
* @param groupId Group ID
* @param courseIds Course IDs to add
* @throws {NotFoundError} If group is not found
* @throws {ValidationError} If course IDs are invalid
* @throws {DatabaseError} If database operation fails
*/
async addCourses(groupId: Types.ObjectId, courseIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.courses.push(...courseIds);
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    if (error.name === 'ValidationError') {
        throw new ValidationError('Invalid course IDs');
    }
    throw new DatabaseError('Failed to add courses to group');
    }
}

/**
* Removes courses from a group
* @param groupId Group ID
* @param courseIds Course IDs to remove
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async removeCourses(groupId: Types.ObjectId, courseIds: Types.ObjectId[]): Promise<void> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    group.courses = group.courses.filter(id => !courseIds.includes(id));
    await group.save();
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to remove courses from group');
    }
}

/**
* Checks if a user is an admin of a group
* @param groupId Group ID
* @param userId User ID to check
* @returns Boolean indicating if user is an admin
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async isUserAdmin(groupId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    return group.admins.includes(userId);
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to check admin status');
    }
}

/**
* Checks if a user is a member of a group
* @param groupId Group ID
* @param userId User ID to check
* @returns Boolean indicating if user is a member
* @throws {NotFoundError} If group is not found
* @throws {DatabaseError} If database operation fails
*/
async isUserMember(groupId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    try {
    const group = await UserGroup.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');

    return group.users.includes(userId);
    } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to check member status');
    }
}
}

