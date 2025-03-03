import { Model, Types } from 'mongoose';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class UserRepository {
constructor(private readonly userModel: Model<User>) {}

// CRUD Operations
async create(userData: Partial<User>): Promise<User> {
    try {
    const user = new this.userModel(userData);
    return await user.save();
    } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
    }
}

async findById(id: string): Promise<User | null> {
    try {
    return await this.userModel.findById(id)
        .select('-password')
        .exec();
    } catch (error) {
    throw new Error(`Failed to find user: ${error.message}`);
    }
}

async update(id: string, updateData: Partial<User>): Promise<User | null> {
    try {
    if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    return await this.userModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
    ).select('-password').exec();
    } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
    }
}

async delete(id: string): Promise<boolean> {
    try {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return !!result;
    } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
    }
}

// Authentication Methods
async findByEmail(email: string): Promise<User | null> {
    try {
    return await this.userModel.findOne({ email }).exec();
    } catch (error) {
    throw new Error(`Failed to find user by email: ${error.message}`);
    }
}

async authenticate(email: string, password: string): Promise<string | null> {
    try {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );

    return token;
    } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
    }
}

// Course Bookmarking
async toggleBookmark(userId: string, courseId: string): Promise<User | null> {
    try {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('User not found');

    const bookmarks = user.bookmarkedCourses || [];
    const courseIdStr = courseId.toString();

    const index = bookmarks.findIndex(id => id.toString() === courseIdStr);
    if (index > -1) {
        bookmarks.splice(index, 1);
    } else {
        bookmarks.push(new Types.ObjectId(courseId));
    }

    return await this.userModel.findByIdAndUpdate(
        userId,
        { $set: { bookmarkedCourses: bookmarks } },
        { new: true }
    ).select('-password').exec();
    } catch (error) {
    throw new Error(`Failed to toggle bookmark: ${error.message}`);
    }
}

// Progress Tracking
async updateProgress(userId: string, courseId: string, progress: number): Promise<User | null> {
    try {
    return await this.userModel.findByIdAndUpdate(
        userId,
        {
        $set: {
            [`courseProgress.${courseId}`]: progress
        }
        },
        { new: true }
    ).select('-password').exec();
    } catch (error) {
    throw new Error(`Failed to update progress: ${error.message}`);
    }
}

async getProgress(userId: string, courseId: string): Promise<number> {
    try {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('User not found');

    return user.courseProgress?.[courseId] || 0;
    } catch (error) {
    throw new Error(`Failed to get progress: ${error.message}`);
    }
}
}

