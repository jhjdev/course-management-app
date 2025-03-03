import mongoose, { Document, Model } from 'mongoose';
import { IUser } from '../models/User';
import { ICourse } from '../models/Course';

interface IEnrollment extends Document {
student: IUser['_id'];
course: ICourse['_id'];
status: 'enrolled' | 'waitlisted' | 'completed';
progress: number;
enrolledAt: Date;
completedAt?: Date;
lastAccessedAt: Date;
waitlistPosition?: number;
}

interface IEnrollmentFilters {
status?: string;
student?: string;
course?: string;
page?: number;
limit?: number;
}

class EnrollmentRepository {
private enrollmentModel: Model<IEnrollment>;

constructor(enrollmentModel: Model<IEnrollment>) {
    this.enrollmentModel = enrollmentModel;
}

// Core enrollment operations
async createEnrollment(studentId: string, courseId: string): Promise<IEnrollment> {
    const session = await mongoose.startSession();
    try {
    session.startTransaction();

    const existingEnrollment = await this.enrollmentModel.findOne({
        student: studentId,
        course: courseId
    });

    if (existingEnrollment) {
        throw new Error('Student already enrolled in this course');
    }

    const enrollment = await this.enrollmentModel.create([{
        student: studentId,
        course: courseId,
        status: 'enrolled',
        progress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date()
    }], { session });

    await session.commitTransaction();
    return enrollment[0];
    } catch (error) {
    await session.abortTransaction();
    throw error;
    } finally {
    session.endSession();
    }
}

async updateEnrollment(enrollmentId: string, updates: Partial<IEnrollment>): Promise<IEnrollment | null> {
    return this.enrollmentModel.findByIdAndUpdate(
    enrollmentId,
    {
        ...updates,
        lastAccessedAt: new Date()
    },
    { new: true }
    );
}

async deleteEnrollment(enrollmentId: string): Promise<boolean> {
    const result = await this.enrollmentModel.findByIdAndDelete(enrollmentId);
    return !!result;
}

async getEnrollment(enrollmentId: string): Promise<IEnrollment | null> {
    return this.enrollmentModel.findById(enrollmentId)
    .populate('student', 'firstName lastName email')
    .populate('course', 'title code');
}

async listEnrollments(filters: IEnrollmentFilters): Promise<{
    enrollments: IEnrollment[];
    total: number;
}> {
    const { status, student, course, page = 1, limit = 10 } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (student) query.student = student;
    if (course) query.course = course;

    const [enrollments, total] = await Promise.all([
    this.enrollmentModel.find(query)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title code')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ enrolledAt: -1 }),
    this.enrollmentModel.countDocuments(query)
    ]);

    return { enrollments, total };
}

// Progress tracking
async updateProgress(enrollmentId: string, progress: number): Promise<IEnrollment | null> {
    if (progress < 0 || progress > 100) {
    throw new Error('Progress must be between 0 and 100');
    }

    return this.enrollmentModel.findByIdAndUpdate(
    enrollmentId,
    {
        progress,
        lastAccessedAt: new Date(),
        ...(progress === 100 ? {
        status: 'completed',
        completedAt: new Date()
        } : {})
    },
    { new: true }
    );
}

async markAsCompleted(enrollmentId: string): Promise<IEnrollment | null> {
    return this.updateProgress(enrollmentId, 100);
}

async getStudentProgress(studentId: string, courseId: string): Promise<IEnrollment | null> {
    return this.enrollmentModel.findOne({
    student: studentId,
    course: courseId
    });
}

// Waitlist management
async addToWaitlist(studentId: string, courseId: string): Promise<IEnrollment> {
    const session = await mongoose.startSession();
    try {
    session.startTransaction();

    const currentWaitlist = await this.enrollmentModel.countDocuments({
        course: courseId,
        status: 'waitlisted'
    });

    const enrollment = await this.enrollmentModel.create([{
        student: studentId,
        course: courseId,
        status: 'waitlisted',
        waitlistPosition: currentWaitlist + 1,
        enrolledAt: new Date(),
        lastAccessedAt: new Date()
    }], { session });

    await session.commitTransaction();
    return enrollment[0];
    } catch (error) {
    await session.abortTransaction();
    throw error;
    } finally {
    session.endSession();
    }
}

async removeFromWaitlist(enrollmentId: string): Promise<boolean> {
    const session = await mongoose.startSession();
    try {
    session.startTransaction();

    const enrollment = await this.enrollmentModel.findById(enrollmentId);
    if (!enrollment || enrollment.status !== 'waitlisted') {
        throw new Error('Enrollment not found or not on waitlist');
    }

    await this.enrollmentModel.deleteOne({ _id: enrollmentId }, { session });

    // Update positions for remaining waitlisted students
    await this.enrollmentModel.updateMany(
        {
        course: enrollment.course,
        status: 'waitlisted',
        waitlistPosition: { $gt: enrollment.waitlistPosition }
        },
        { $inc: { waitlistPosition: -1 } },
        { session }
    );

    await session.commitTransaction();
    return true;
    } catch (error) {
    await session.abortTransaction();
    throw error;
    } finally {
    session.endSession();
    }
}

async moveFromWaitlist(enrollmentId: string): Promise<IEnrollment | null> {
    const session = await mongoose.startSession();
    try {
    session.startTransaction();

    const enrollment = await this.enrollmentModel.findByIdAndUpdate(
        enrollmentId,
        {
        status: 'enrolled',
        waitlistPosition: undefined,
        lastAccessedAt: new Date()
        },
        { new: true, session }
    );

    if (enrollment) {
        // Update remaining waitlist positions
        await this.enrollmentModel.updateMany(
        {
            course: enrollment.course,
            status: 'waitlisted',
            waitlistPosition: { $gt: enrollment.waitlistPosition }
        },
        { $inc: { waitlistPosition: -1 } },
        { session }
        );
    }

    await session.commitTransaction();
    return enrollment;
    } catch (error) {
    await session.abortTransaction();
    throw error;
    } finally {
    session.endSession();
    }
}

async getWaitlistPosition(enrollmentId: string): Promise<number | null> {
    const enrollment = await this.enrollmentModel.findById(enrollmentId);
    return enrollment?.waitlistPosition || null;
}
}

export default EnrollmentRepository;

