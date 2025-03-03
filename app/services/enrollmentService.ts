import { Types } from 'mongoose';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from './notificationService';
import { ValidationError, BusinessError } from '../utils/errors';
import { IEnrollment, EnrollmentStatus } from '../models/Enrollment';
import { ICourse } from '../models/Course';
import { IUser } from '../models/User';
import { CacheService } from '../utils/cache';

export class EnrollmentService {
constructor(
    private enrollmentRepository: EnrollmentRepository,
    private courseRepository: CourseRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService,
    private cacheService: CacheService
) {}

async enrollStudent(
    courseId: string,
    userId: string,
    options = { waitlist: true }
): Promise<IEnrollment> {
    // Validate course and user existence
    const [course, user] = await Promise.all([
    this.courseRepository.findById(courseId),
    this.userRepository.findById(userId)
    ]);

    if (!course || !user) {
    throw new ValidationError('Course or user not found');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findByCourseAndUser(courseId, userId);
    if (existingEnrollment) {
    throw new BusinessError('Student already enrolled in this course');
    }

    // Check prerequisites
    await this.validatePrerequisites(course, user);

    // Check course capacity
    const currentEnrollments = await this.enrollmentRepository.countByCourse(courseId);
    if (currentEnrollments >= course.maxStudents) {
    if (!options.waitlist) {
        throw new BusinessError('Course is full');
    }
    return this.addToWaitlist(course, user);
    }

    // Create enrollment
    const enrollment = await this.enrollmentRepository.create({
    courseId,
    userId,
    status: EnrollmentStatus.ACTIVE,
    progress: 0,
    startDate: new Date()
    });

    // Send notifications
    await this.notificationService.sendEnrollmentConfirmation(user.email, course.title);

    // Update cache
    await this.cacheService.invalidate(`course-enrollments-${courseId}`);

    return enrollment;
}

async unenrollStudent(courseId: string, userId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findByCourseAndUser(courseId, userId);
    if (!enrollment) {
    throw new ValidationError('Enrollment not found');
    }

    await this.enrollmentRepository.delete(enrollment._id);

    // Process waitlist if anyone waiting
    await this.processWaitlist(courseId);

    // Send notifications
    const [course, user] = await Promise.all([
    this.courseRepository.findById(courseId),
    this.userRepository.findById(userId)
    ]);

    if (course && user) {
    await this.notificationService.sendUnenrollmentConfirmation(user.email, course.title);
    }

    // Update cache
    await this.cacheService.invalidate(`course-enrollments-${courseId}`);
}

async updateProgress(
    enrollmentId: string,
    progress: number
): Promise<IEnrollment> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
    throw new ValidationError('Enrollment not found');
    }

    if (progress < 0 || progress > 100) {
    throw new ValidationError('Progress must be between 0 and 100');
    }

    enrollment.progress = progress;

    // Check for milestone notifications
    if (this.isProgressMilestone(progress)) {
    const [course, user] = await Promise.all([
        this.courseRepository.findById(enrollment.courseId),
        this.userRepository.findById(enrollment.userId)
    ]);
    
    if (course && user) {
        await this.notificationService.sendProgressMilestone(
        user.email,
        course.title,
        progress
        );
    }
    }

    // Mark as completed if 100%
    if (progress === 100) {
    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.completionDate = new Date();

    const [course, user] = await Promise.all([
        this.courseRepository.findById(enrollment.courseId),
        this.userRepository.findById(enrollment.userId)
    ]);

    if (course && user) {
        await this.notificationService.sendCourseCompletion(user.email, course.title);
    }
    }

    return this.enrollmentRepository.update(enrollmentId, enrollment);
}

async getEnrollmentAnalytics(courseId: string) {
    const cacheKey = `course-analytics-${courseId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const analytics = await this.enrollmentRepository.getAnalytics(courseId);
    await this.cacheService.set(cacheKey, analytics, 3600); // Cache for 1 hour

    return analytics;
}

private async validatePrerequisites(course: ICourse, user: IUser): Promise<void> {
    if (!course.prerequisites?.length) return;

    const completedCourses = await this.enrollmentRepository.findCompletedCourses(user._id);
    const missingPrerequisites = course.prerequisites.filter(
    prereqId => !completedCourses.includes(prereqId.toString())
    );

    if (missingPrerequisites.length > 0) {
    throw new BusinessError('Missing required prerequisites');
    }
}

private async addToWaitlist(course: ICourse, user: IUser): Promise<IEnrollment> {
    const waitlistPosition = await this.enrollmentRepository.addToWaitlist(course._id, user._id);
    
    await this.notificationService.sendWaitlistConfirmation(
    user.email,
    course.title,
    waitlistPosition
    );

    return this.enrollmentRepository.create({
    courseId: course._id,
    userId: user._id,
    status: EnrollmentStatus.WAITLISTED,
    waitlistPosition
    });
}

private async processWaitlist(courseId: string): Promise<void> {
    const nextInLine = await this.enrollmentRepository.getNextInWaitlist(courseId);
    if (!nextInLine) return;

    const currentEnrollments = await this.enrollmentRepository.countByCourse(courseId);
    const course = await this.courseRepository.findById(courseId);

    if (course && currentEnrollments < course.maxStudents) {
    await this.promoteFromWaitlist(nextInLine);
    }
}

private async promoteFromWaitlist(enrollment: IEnrollment): Promise<void> {
    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.startDate = new Date();
    delete enrollment.waitlistPosition;

    await this.enrollmentRepository.update(enrollment._id, enrollment);

    const [course, user] = await Promise.all([
    this.courseRepository.findById(enrollment.courseId),
    this.userRepository.findById(enrollment.userId)
    ]);

    if (course && user) {
    await this.notificationService.sendWaitlistPromotion(user.email, course.title);
    }
}

private isProgressMilestone(progress: number): boolean {
    return progress === 25 || progress === 50 || progress === 75;
}
}

