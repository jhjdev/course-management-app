import { Course } from '../models/Course';
import { User } from '../models/User';
import { NotificationService } from './notificationService';
import { EnrollmentService } from './enrollmentService';
import { WaitlistService } from './waitlistService';
import { ValidationError, ConflictError } from '../utils/errors';

interface TimeSlot {
startTime: Date;
endTime: Date;
dayOfWeek: number;
}

interface CourseSchedule {
courseId: string;
instructorId: string;
roomId: string;
startDate: Date;
endDate: Date;
timeSlots: TimeSlot[];
capacity: number;
}

export class CoursePlanningService {
constructor(
    private notificationService: NotificationService,
    private enrollmentService: EnrollmentService,
    private waitlistService: WaitlistService
) {}

async createCourseSchedule(schedule: CourseSchedule): Promise<CourseSchedule> {
    await this.validateSchedule(schedule);
    const conflicts = await this.detectConflicts(schedule);
    
    if (conflicts.length > 0) {
    throw new ConflictError('Schedule conflicts detected', conflicts);
    }

    // Create the schedule
    const createdSchedule = await Course.findByIdAndUpdate(
    schedule.courseId,
    { 
        $set: {
        schedule: schedule,
        status: 'scheduled'
        }
    },
    { new: true }
    );

    await this.notificationService.notifyInstructor(schedule.instructorId, 'COURSE_SCHEDULED', createdSchedule);
    return createdSchedule;
}

async modifySchedule(scheduleId: string, updates: Partial<CourseSchedule>): Promise<CourseSchedule> {
    const existingSchedule = await Course.findOne({ 'schedule._id': scheduleId });
    if (!existingSchedule) {
    throw new ValidationError('Schedule not found');
    }

    const updatedSchedule = { ...existingSchedule.schedule, ...updates };
    await this.validateSchedule(updatedSchedule);
    
    const conflicts = await this.detectConflicts(updatedSchedule, scheduleId);
    if (conflicts.length > 0) {
    throw new ConflictError('Schedule conflicts detected', conflicts);
    }

    const updated = await Course.findOneAndUpdate(
    { 'schedule._id': scheduleId },
    { $set: { schedule: updatedSchedule } },
    { new: true }
    );

    await this.notifyScheduleChanges(updated);
    return updated;
}

async assignInstructor(courseId: string, instructorId: string): Promise<void> {
    const instructor = await User.findOne({ _id: instructorId, role: 'instructor' });
    if (!instructor) {
    throw new ValidationError('Invalid instructor');
    }

    const course = await Course.findById(courseId);
    if (!course) {
    throw new ValidationError('Course not found');
    }

    // Check instructor qualifications and availability
    await this.validateInstructorAssignment(instructor, course);
    
    await Course.findByIdAndUpdate(courseId, { 
    $set: { instructorId: instructorId }
    });

    await this.notificationService.notifyInstructor(instructorId, 'COURSE_ASSIGNMENT', course);
}

private async validateSchedule(schedule: CourseSchedule): Promise<void> {
    if (schedule.startDate >= schedule.endDate) {
    throw new ValidationError('Invalid date range');
    }

    if (schedule.capacity < 1) {
    throw new ValidationError('Invalid capacity');
    }

    // Validate time slots
    for (const slot of schedule.timeSlots) {
    if (slot.startTime >= slot.endTime) {
        throw new ValidationError('Invalid time slot');
    }
    }
}

private async detectConflicts(schedule: CourseSchedule, excludeId?: string): Promise<any[]> {
    const conflicts = [];

    // Check room conflicts
    const roomConflicts = await this.checkRoomConflicts(schedule, excludeId);
    conflicts.push(...roomConflicts);

    // Check instructor conflicts
    const instructorConflicts = await this.checkInstructorConflicts(schedule, excludeId);
    conflicts.push(...instructorConflicts);

    return conflicts;
}

private async checkRoomConflicts(schedule: CourseSchedule, excludeId?: string): Promise<any[]> {
    return Course.find({
    'schedule.roomId': schedule.roomId,
    'schedule._id': { $ne: excludeId },
    $or: schedule.timeSlots.map(slot => ({
        'schedule.timeSlots': {
        $elemMatch: {
            dayOfWeek: slot.dayOfWeek,
            startTime: { $lt: slot.endTime },
            endTime: { $gt: slot.startTime }
        }
        }
    }))
    });
}

private async checkInstructorConflicts(schedule: CourseSchedule, excludeId?: string): Promise<any[]> {
    return Course.find({
    'schedule.instructorId': schedule.instructorId,
    'schedule._id': { $ne: excludeId },
    $or: schedule.timeSlots.map(slot => ({
        'schedule.timeSlots': {
        $elemMatch: {
            dayOfWeek: slot.dayOfWeek,
            startTime: { $lt: slot.endTime },
            endTime: { $gt: slot.startTime }
        }
        }
    }))
    });
}

private async validateInstructorAssignment(instructor: any, course: any): Promise<void> {
    // Check instructor qualifications
    if (!this.checkInstructorQualifications(instructor, course)) {
    throw new ValidationError('Instructor not qualified for this course');
    }

    // Check instructor current load
    const currentLoad = await Course.countDocuments({
    instructorId: instructor._id,
    status: { $in: ['active', 'scheduled'] }
    });

    if (currentLoad >= instructor.maxCourseLoad) {
    throw new ValidationError('Instructor has reached maximum course load');
    }
}

private checkInstructorQualifications(instructor: any, course: any): boolean {
    // Implementation would check instructor's qualifications against course requirements
    return true; // Placeholder implementation
}

private async notifyScheduleChanges(course: any): Promise<void> {
    const enrolledStudents = await this.enrollmentService.getEnrolledStudents(course._id);
    
    for (const student of enrolledStudents) {
    await this.notificationService.notifyStudent(
        student._id,
        'SCHEDULE_CHANGE',
        course
    );
    }
}
}

