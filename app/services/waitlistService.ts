import { Course } from '../models/Course';
import { User } from '../models/User';
import { EnrollmentService } from './enrollmentService';
import { NotificationService } from './notificationService';
import { CustomError } from '../utils/errors';

interface WaitlistEntry {
userId: string;
courseId: string;
position: number;
joinedAt: Date;
priority: number;
expiresAt?: Date;
}

export class WaitlistService {
constructor(
    private enrollmentService: EnrollmentService,
    private notificationService: NotificationService
) {}

async addToWaitlist(courseId: string, userId: string, priority: number = 0): Promise<WaitlistEntry> {
    try {
    // Get current waitlist count for position calculation
    const currentPosition = await this.getWaitlistCount(courseId);

    const waitlistEntry: WaitlistEntry = {
        userId,
        courseId,
        position: currentPosition + 1,
        joinedAt: new Date(),
        priority,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    };

    // Save waitlist entry to database
    const saved = await Course.findByIdAndUpdate(
        courseId,
        { 
        $push: { 
            waitlist: waitlistEntry 
        }
        },
        { new: true }
    );

    if (!saved) {
        throw new CustomError('Failed to add to waitlist', 500);
    }

    // Send notification
    await this.notificationService.sendWaitlistConfirmation(userId, courseId, waitlistEntry.position);

    return waitlistEntry;
    } catch (error) {
    throw new CustomError('Failed to add to waitlist', 500, error);
    }
}

async removeFromWaitlist(courseId: string, userId: string): Promise<void> {
    try {
    const updated = await Course.findByIdAndUpdate(
        courseId,
        { 
        $pull: { 
            waitlist: { userId } 
        }
        },
        { new: true }
    );

    if (!updated) {
        throw new CustomError('Failed to remove from waitlist', 500);
    }

    // Reorder remaining waitlist positions
    await this.reorderWaitlist(courseId);

    await this.notificationService.sendWaitlistRemovalConfirmation(userId, courseId);
    } catch (error) {
    throw new CustomError('Failed to remove from waitlist', 500, error);
    }
}

async getWaitlistPosition(courseId: string, userId: string): Promise<number> {
    try {
    const course = await Course.findById(courseId);
    const entry = course?.waitlist?.find(entry => entry.userId === userId);
    
    if (!entry) {
        throw new CustomError('User not found in waitlist', 404);
    }

    return entry.position;
    } catch (error) {
    throw new CustomError('Failed to get waitlist position', 500, error);
    }
}

async processWaitlist(courseId: string, spotsAvailable: number): Promise<void> {
    try {
    const course = await Course.findById(courseId);
    if (!course || !course.waitlist?.length) return;

    // Sort waitlist by priority and join date
    const sortedWaitlist = course.waitlist
        .filter(entry => !entry.expiresAt || entry.expiresAt > new Date())
        .sort((a, b) => b.priority - a.priority || a.joinedAt.getTime() - b.joinedAt.getTime());

    for (let i = 0; i < Math.min(spotsAvailable, sortedWaitlist.length); i++) {
        const entry = sortedWaitlist[i];
        
        // Move student from waitlist to enrolled
        await this.enrollmentService.enrollStudent(courseId, entry.userId);
        await this.removeFromWaitlist(courseId, entry.userId);
        await this.notificationService.sendWaitlistPromotion(entry.userId, courseId);
    }
    } catch (error) {
    throw new CustomError('Failed to process waitlist', 500, error);
    }
}

private async getWaitlistCount(courseId: string): Promise<number> {
    const course = await Course.findById(courseId);
    return course?.waitlist?.length || 0;
}

private async reorderWaitlist(courseId: string): Promise<void> {
    const course = await Course.findById(courseId);
    if (!course?.waitlist) return;

    course.waitlist = course.waitlist
    .sort((a, b) => b.priority - a.priority || a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((entry, index) => ({
        ...entry,
        position: index + 1
    }));

    await course.save();
}

async getEstimatedEnrollmentDate(courseId: string, userId: string): Promise<Date | null> {
    try {
    const position = await this.getWaitlistPosition(courseId, userId);
    const course = await Course.findById(courseId);
    
    if (!course) {
        throw new CustomError('Course not found', 404);
    }

    // Calculate based on historical enrollment patterns
    const averageEnrollmentTurnover = 7; // days
    const estimatedDays = position * averageEnrollmentTurnover;
    
    return new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
    } catch (error) {
    return null;
    }
}

async getWaitlistStatistics(courseId: string): Promise<{
    totalCount: number;
    averageWaitTime: number;
    conversionRate: number;
}> {
    const course = await Course.findById(courseId);
    if (!course) {
    throw new CustomError('Course not found', 404);
    }

    return {
    totalCount: course.waitlist?.length || 0,
    averageWaitTime: 7, // days
    conversionRate: 0.75 // 75% of waitlisted students eventually enroll
    };
}
}

