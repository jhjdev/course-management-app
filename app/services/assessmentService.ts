import { Types } from 'mongoose';
import { Course } from '../models/Course';
import { User } from '../models/User';
import { NotificationService } from './notificationService';
import { ProgressTrackingService } from './progressTrackingService';
import { GamificationService } from './gamificationService';
import { ValidationError, NotFoundError } from '../utils/errors';

interface IAssessmentConfig {
timeLimit?: number;
maxAttempts?: number;
passScore?: number;
randomizeQuestions?: boolean;
showAnswers?: boolean;
}

interface IQuestion {
text: string;
type: 'multiple_choice' | 'essay' | 'coding' | 'true_false';
options?: string[];
correctAnswer?: string | string[];
points: number;
rubric?: IRubricCriteria[];
}

interface IRubricCriteria {
criterion: string;
points: number;
description: string;
}

interface ISubmission {
userId: Types.ObjectId;
assessmentId: Types.ObjectId;
answers: Record<string, any>;
startTime: Date;
submitTime?: Date;
score?: number;
feedback?: string;
attempt: number;
}

export class AssessmentService {
constructor(
    private notificationService: NotificationService,
    private progressTrackingService: ProgressTrackingService,
    private gamificationService: GamificationService
) {}

async createAssessment(courseId: string, data: {
    title: string;
    description: string;
    type: string;
    questions: IQuestion[];
    config: IAssessmentConfig;
    dueDate?: Date;
}) {
    try {
    // Validate assessment data
    this.validateAssessmentData(data);

    // Create assessment with specified configuration
    const assessment = await Assessment.create({
        courseId,
        ...data,
        status: 'draft'
    });

    return assessment;
    } catch (error) {
    throw new Error(`Failed to create assessment: ${error.message}`);
    }
}

async submitAssessment(userId: string, assessmentId: string, answers: Record<string, any>) {
    try {
    // Validate submission eligibility
    await this.validateSubmissionEligibility(userId, assessmentId);

    // Process submission and grade if auto-gradeable
    const submission = await this.processSubmission(userId, assessmentId, answers);

    // Update progress and trigger gamification
    await this.handleSubmissionCompletion(userId, assessmentId, submission);

    return submission;
    } catch (error) {
    throw new Error(`Failed to submit assessment: ${error.message}`);
    }
}

async gradeSubmission(submissionId: string, feedback: {
    score: number;
    comments: string;
    criteriaScores?: Record<string, number>;
}) {
    try {
    const submission = await this.updateSubmissionGrade(submissionId, feedback);
    
    // Update progress and notifications
    await this.handleGradingCompletion(submission);

    return submission;
    } catch (error) {
    throw new Error(`Failed to grade submission: ${error.message}`);
    }
}

private async validateSubmissionEligibility(userId: string, assessmentId: string) {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
    throw new NotFoundError('Assessment not found');
    }

    // Check attempt limits
    const attempts = await this.getSubmissionAttempts(userId, assessmentId);
    if (assessment.config.maxAttempts && attempts >= assessment.config.maxAttempts) {
    throw new ValidationError('Maximum attempts reached');
    }

    // Check due date
    if (assessment.dueDate && new Date() > assessment.dueDate) {
    throw new ValidationError('Assessment submission deadline has passed');
    }
}

private async processSubmission(userId: string, assessmentId: string, answers: Record<string, any>) {
    const assessment = await Assessment.findById(assessmentId);
    const submission = {
    userId,
    assessmentId,
    answers,
    startTime: new Date(),
    submitTime: new Date(),
    attempt: await this.getNextAttemptNumber(userId, assessmentId)
    };

    // Auto-grade if possible
    if (this.canAutoGrade(assessment)) {
    submission.score = await this.calculateAutoGradeScore(assessment, answers);
    }

    return await Submission.create(submission);
}

private async handleSubmissionCompletion(userId: string, assessmentId: string, submission: ISubmission) {
    // Update progress
    await this.progressTrackingService.updateAssessmentProgress(userId, assessmentId, submission);

    // Award points if auto-graded
    if (submission.score !== undefined) {
    await this.gamificationService.awardAssessmentPoints(userId, submission.score);
    }

    // Send notifications
    await this.notificationService.sendAssessmentSubmittedNotification(userId, assessmentId);
}

private validateAssessmentData(data: any) {
    if (!data.title || !data.questions || data.questions.length === 0) {
    throw new ValidationError('Invalid assessment data');
    }

    // Validate questions
    data.questions.forEach(question => {
    this.validateQuestion(question);
    });
}

private validateQuestion(question: IQuestion) {
    if (!question.text || !question.type || question.points === undefined) {
    throw new ValidationError('Invalid question format');
    }

    // Type-specific validation
    switch (question.type) {
    case 'multiple_choice':
        if (!question.options || question.options.length < 2) {
        throw new ValidationError('Multiple choice questions must have at least 2 options');
        }
        break;
    case 'essay':
        if (question.correctAnswer) {
        throw new ValidationError('Essay questions cannot have pre-defined correct answers');
        }
        break;
    }
}

// Add more private helper methods as needed
}

