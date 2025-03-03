import { Types } from 'mongoose';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';
import { FeedbackRepository } from '../repositories/feedbackRepository';
import { UserRepository } from '../repositories/userRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { FeedbackValidation } from '../validation/feedbackValidation';
import { 
FeedbackType, 
Visibility, 
FeedbackStatus,
IFeedback,
IFeedbackCreate,
IFeedbackUpdate,
IFeedbackResponse
} from '../interfaces/feedback.interface';

export class FeedbackService {
constructor(
    private feedbackRepository: FeedbackRepository,
    private userRepository: UserRepository,
    private courseRepository: CourseRepository,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
) {}

// Course Rating and Review Management
async submitCourseReview(userId: string, courseId: string, data: IFeedbackCreate): Promise<IFeedback> {
    await FeedbackValidation.validateReview(data);
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error('Course not found');

    const feedback = await this.feedbackRepository.create({
    ...data,
    type: FeedbackType.COURSE_REVIEW,
    userId,
    courseId,
    status: FeedbackStatus.PENDING
    });

    await this.notificationService.notifyInstructor(course.instructorId, 'NEW_REVIEW', { courseId });
    await this.analyticsService.trackFeedbackSubmission(feedback);

    return feedback;
}

// Student Satisfaction Surveys
async createSatisfactionSurvey(courseId: string, template: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error('Course not found');

    await this.feedbackRepository.createSurvey({
    courseId,
    template,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: FeedbackStatus.ACTIVE
    });

    const enrolledStudents = await this.courseRepository.getEnrolledStudents(courseId);
    await this.notificationService.notifyMultiple(
    enrolledStudents,
    'SURVEY_AVAILABLE',
    { courseId }
    );
}

// Anonymous Feedback
async submitAnonymousFeedback(courseId: string, data: IFeedbackCreate): Promise<IFeedback> {
    await FeedbackValidation.validateAnonymousFeedback(data);
    
    return this.feedbackRepository.create({
    ...data,
    type: FeedbackType.ANONYMOUS,
    courseId,
    visibility: Visibility.INSTRUCTORS_ONLY
    });
}

// Feedback Moderation
async moderateFeedback(feedbackId: string, action: 'approve' | 'reject', reason?: string): Promise<void> {
    const feedback = await this.feedbackRepository.findById(feedbackId);
    if (!feedback) throw new Error('Feedback not found');

    const status = action === 'approve' ? FeedbackStatus.APPROVED : FeedbackStatus.REJECTED;
    await this.feedbackRepository.updateStatus(feedbackId, status, reason);

    if (feedback.userId) {
    await this.notificationService.notifyUser(
        feedback.userId,
        'FEEDBACK_MODERATION',
        { status, reason }
    );
    }
}

// Analytics and Reporting
async generateFeedbackReport(courseId: string): Promise<any> {
    const feedback = await this.feedbackRepository.getFeedbackForCourse(courseId);
    return this.analyticsService.analyzeFeedback(feedback);
}

// Automated Reminders
async sendFeedbackReminders(courseId: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error('Course not found');

    const studentsWithoutFeedback = await this.feedbackRepository.getStudentsWithoutFeedback(courseId);
    
    await this.notificationService.notifyMultiple(
    studentsWithoutFeedback,
    'FEEDBACK_REMINDER',
    { courseId }
    );
}

// Response Management
async respondToFeedback(feedbackId: string, response: IFeedbackResponse): Promise<void> {
    const feedback = await this.feedbackRepository.findById(feedbackId);
    if (!feedback) throw new Error('Feedback not found');

    await this.feedbackRepository.addResponse(feedbackId, response);

    if (feedback.userId) {
    await this.notificationService.notifyUser(
        feedback.userId,
        'FEEDBACK_RESPONSE',
        { feedbackId }
    );
    }
}

// Feedback Templates
async createFeedbackTemplate(template: any): Promise<void> {
    await FeedbackValidation.validateTemplate(template);
    await this.feedbackRepository.saveTemplate(template);
}

// Aggregation and Statistics
async getFeedbackStats(courseId: string): Promise<any> {
    const feedback = await this.feedbackRepository.getFeedbackForCourse(courseId);
    return {
    averageRating: this.calculateAverageRating(feedback),
    totalReviews: feedback.length,
    sentimentScore: await this.analyticsService.analyzeSentiment(feedback),
    categoryBreakdown: this.categorizeFeedback(feedback)
    };
}

private calculateAverageRating(feedback: IFeedback[]): number {
    if (!feedback.length) return 0;
    const sum = feedback.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return sum / feedback.length;
}

private categorizeFeedback(feedback: IFeedback[]): Record<string, number> {
    return feedback.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
    }, {} as Record<string, number>);
}
}

