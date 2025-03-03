import { Model, Types } from 'mongoose';
import { Course } from '../models/Course';

export interface ICourseCreate {
title: string;
description: string;
category: string;
creator: Types.ObjectId;
difficulty: 'beginner' | 'intermediate' | 'advanced';
price?: number;
maxStudents?: number;
startDate?: Date;
endDate?: Date;
status?: 'draft' | 'published' | 'archived';
requirements?: string[];
objectives?: string[];
sections?: {
    title: string;
    content: string;
    order: number;
}[];
}

export interface ICourseQuery {
title?: string;
category?: string;
difficulty?: 'beginner' | 'intermediate' | 'advanced';
creator?: Types.ObjectId;
status?: 'draft' | 'published' | 'archived';
minPrice?: number;
maxPrice?: number;
startDate?: Date;
endDate?: Date;
hasAvailableSeats?: boolean;
searchText?: string;
tags?: string[];
page?: number;
limit?: number;
sort?: keyof ICourseCreate;
order?: 'asc' | 'desc';
}

export interface IEnrollmentStatus {
canEnroll: boolean;
reason?: string;
waitlistPosition?: number;
availableSeats?: number;
enrollmentDeadline?: Date;
prerequisites?: {
    met: boolean;
    missing: string[];
};
}

export class CourseRepository {
constructor(private readonly courseModel: Model<Course>) {}

// CRUD Operations
async create(courseData: ICourseCreate): Promise<Course> {
try {
    const course = new this.courseModel(courseData);
    return await course.save();
} catch (error) {
    throw new Error(`Failed to create course: ${error.message}`);
}
}

async findById(id: string): Promise<Course | null> {
    try {
    return await this.courseModel.findById(id)
        .populate('creator', 'name email')
        .exec();
    } catch (error) {
    throw new Error(`Failed to find course: ${error.message}`);
    }
}

async update(id: string, updateData: Partial<Course>): Promise<Course | null> {
    try {
    return await this.courseModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    ).exec();
    } catch (error) {
    throw new Error(`Failed to update course: ${error.message}`);
    }
}

async delete(id: string): Promise<boolean> {
    try {
    const result = await this.courseModel.findByIdAndDelete(id).exec();
    return !!result;
    } catch (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
    }
}

// Advanced Search and Filtering
async findAll(query: ICourseQuery): Promise<{ courses: Course[]; total: number }> {
try {
    const { 
        title, category, difficulty, creator, status, 
        minPrice, maxPrice, startDate, endDate,
        hasAvailableSeats, searchText, tags,
        page = 1, limit = 10, 
        sort = 'createdAt', order = 'desc' 
    } = query;
    const filter: any = {};

    if (searchText) {
        filter.$or = [
        { title: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } }
        ];
    }
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (creator) filter.creator = creator;
    if (status) filter.status = status;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
    }
    if (startDate) filter.startDate = { $gte: startDate };
    if (endDate) filter.endDate = { $lte: endDate };
    if (tags?.length) filter.tags = { $all: tags };
    if (hasAvailableSeats) {
        filter.$expr = {
        $lt: [{ $size: "$enrolledStudents" }, "$maxStudents"]
        };
    }

    const sortOptions: any = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const [courses, total] = await Promise.all([
    this.courseModel.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('creator', 'name email')
        .exec(),
    this.courseModel.countDocuments(filter)
    ]);

    return { courses, total };
    } catch (error) {
    throw new Error(`Failed to search courses: ${error.message}`);
    }
}

// Enrollment Management
async enroll(courseId: string, userId: string): Promise<Course> {
    try {
    return await this.courseModel.findByIdAndUpdate(
        courseId,
        { $addToSet: { enrolledStudents: userId } },
        { new: true }
    ).exec();
    } catch (error) {
    throw new Error(`Failed to enroll in course: ${error.message}`);
    }
}

async unenroll(courseId: string, userId: string): Promise<Course> {
    try {
    return await this.courseModel.findByIdAndUpdate(
        courseId,
        { $pull: { enrolledStudents: userId } },
        { new: true }
    ).exec();
    } catch (error) {
    throw new Error(`Failed to unenroll from course: ${error.message}`);
    }
}

// Course Status Management
async updateStatus(courseId: string, status: 'draft' | 'published' | 'archived'): Promise<Course> {
try {
    const course = await this.courseModel.findByIdAndUpdate(
    courseId,
    { status },
    { new: true, runValidators: true }
    ).exec();

    if (!course) {
    throw new Error('Course not found');
    }

    return course;
} catch (error) {
    throw new Error(`Failed to update course status: ${error.message}`);
}
}

async findTeachingCourses(instructorId: string): Promise<Course[]> {
try {
    return await this.courseModel.find({ creator: instructorId })
    .populate('creator', 'name email')
    .sort({ createdAt: -1 })
    .exec();
} catch (error) {
    throw new Error(`Failed to find teaching courses: ${error.message}`);
}
}

async findPublishedCourses(): Promise<Course[]> {
try {
    return await this.courseModel.find({ status: 'published' })
    .populate('creator', 'name email')
    .sort({ createdAt: -1 })
    .exec();
} catch (error) {
    throw new Error(`Failed to find published courses: ${error.message}`);
}
}

async findDraftCourses(instructorId: string): Promise<Course[]> {
try {
    return await this.courseModel.find({ 
    creator: instructorId,
    status: 'draft'
    })
    .populate('creator', 'name email')
    .sort({ createdAt: -1 })
    .exec();
} catch (error) {
    throw new Error(`Failed to find draft courses: ${error.message}`);
}
}

// Enrollment Management
async getEnrollmentStatus(courseId: string, userId: string): Promise<IEnrollmentStatus> {
try {
    const course = await this.courseModel.findById(courseId).exec();
    if (!course) {
    throw new Error('Course not found');
    }

    const isEnrolled = course.enrolledStudents.some(studentId => 
    studentId.toString() === userId
    );

    if (isEnrolled) {
    return { canEnroll: false, reason: 'Already enrolled' };
    }

    const enrolledCount = course.enrolledStudents.length;
    const maxStudents = course.maxStudents || Infinity;

    if (enrolledCount >= maxStudents) {
    return { 
        canEnroll: false, 
        reason: 'Course is full',
        waitlistPosition: enrolledCount - maxStudents + 1
    };
    }

    return { canEnroll: true };
} catch (error) {
    throw new Error(`Failed to check enrollment status: ${error.message}`);
}
}

async validateEnrollment(courseId: string, userId: string): Promise<boolean> {
try {
    const enrollmentStatus = await this.getEnrollmentStatus(courseId, userId);
    return enrollmentStatus.canEnroll;
} catch (error) {
    throw new Error(`Failed to validate enrollment: ${error.message}`);
}
}

// Rating System
async updateRating(courseId: string, userId: string, rating: number, review?: string): Promise<Course> {
try {
    // First remove old rating if exists
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    
    const existingRatingIndex = course.ratings.findIndex(r => r.user.toString() === userId);
    if (existingRatingIndex !== -1) {
    const oldRating = course.ratings[existingRatingIndex].rating;
    await this.courseModel.updateOne(
        { _id: courseId },
        { 
        $pull: { ratings: { user: userId } },
        $inc: { totalRatings: -1, ratingSum: -oldRating }
        }
    );
    }
    
    return await this.courseModel.findByIdAndUpdate(
    courseId,
    {
        $push: { ratings: { user: userId, rating, review, date: new Date() } },
        $inc: { totalRatings: 1, ratingSum: rating }
    },
    { new: true }
    ).exec();
} catch (error) {
    throw new Error(`Failed to update rating: ${error.message}`);
}
}

async addRating(courseId: string, userId: string, rating: number, review?: string): Promise<Course> {
    try {
    const ratingObj = {
        user: userId,
        rating,
        review,
        date: new Date()
    };

    return await this.courseModel.findByIdAndUpdate(
        courseId,
        {
        $push: { ratings: ratingObj },
        $inc: { totalRatings: 1, ratingSum: rating }
        },
        { new: true }
    ).exec();
    } catch (error) {
    throw new Error(`Failed to add rating: ${error.message}`);
    }
}

async findEnrolledCourses(userId: string): Promise<Course[]> {
try {
    return await this.courseModel.find({
    enrolledStudents: userId
    })
    .populate('creator', 'name email')
    .select('-ratings')
    .exec();
} catch (error) {
    throw new Error(`Failed to find enrolled courses: ${error.message}`);
}
}

async isEnrolled(courseId: string, userId: string): Promise<boolean> {
try {
    const course = await this.courseModel.findOne({
    _id: courseId,
    enrolledStudents: userId
    }).exec();
    return !!course;
} catch (error) {
    throw new Error(`Failed to check enrollment status: ${error.message}`);
}
}

// Course Analytics
async getAnalytics(courseId: string): Promise<{
    totalEnrolled: number;
    averageRating: number;
    completionRate: number;
}> {
    try {
    const course = await this.courseModel.findById(courseId).exec();
    if (!course) throw new Error('Course not found');

    const totalEnrolled = course.enrolledStudents?.length || 0;
    const averageRating = course.ratingSum / (course.totalRatings || 1);
    const completionRate = (course.completions || 0) / (totalEnrolled || 1) * 100;

    return {
        totalEnrolled,
        averageRating,
        completionRate
    };
    } catch (error) {
    throw new Error(`Failed to get analytics: ${error.message}`);
    }
}
}

