import nodemailer from 'nodemailer';
import { renderTemplate } from '../templates/emailTemplates';
import Queue from 'bull';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Logger } from '../utils/logger';

enum NotificationType {
    COURSE_UPDATE = 'COURSE_UPDATE',
    PROGRESS_MILESTONE = 'PROGRESS_MILESTONE',
    ASSIGNMENT = 'ASSIGNMENT',
    ENROLLMENT = 'ENROLLMENT',
    WAITLIST = 'WAITLIST',
    COMPLETION = 'COMPLETION',
    REMINDER = 'REMINDER',
    ACHIEVEMENT = 'ACHIEVEMENT',
    SYSTEM = 'SYSTEM'
}

enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

enum NotificationChannel {
EMAIL = 'EMAIL',
IN_APP = 'IN_APP',
PUSH = 'PUSH'
}

interface NotificationPreferences {
userId: string;
channels: {
    [key in NotificationType]: NotificationChannel[];
};
enabled: boolean;
}

interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    metadata: Record<string, any>;
    isRead: boolean;
    isSent: boolean;
    isDelivered: boolean;
    deliveredAt?: Date;
    readAt?: Date;
    createdAt: Date;
    scheduledFor?: Date;
    templateVersion?: string;
    ttl?: number;
    retryCount: number;
    error?: string;
}

interface NotificationQuery {
userId: string;
types?: NotificationType[];
isRead?: boolean;
startDate?: Date;
endDate?: Date;
page?: number;
limit?: number;
}

interface EmailOptions {
to: string;
subject: string;
template: string;
context: Record<string, any>;
}

class NotificationService {
private static instance: NotificationService;
private notificationPreferences: Map<string, NotificationPreferences>;
private notifications: Notification[];
private emailQueue: Queue;
private mailer: nodemailer.Transporter;
private logger: Logger;

constructor() {
    this.emailQueue = new Queue('email-queue', process.env.REDIS_URL);
    this.mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
    });
    this.logger = new Logger('NotificationService');
    this.notificationPreferences = new Map();
    this.notifications = [];

    if (NotificationService.instance) {
        return NotificationService.instance;
    }
    NotificationService.instance = this;

    // Process email queue
    this.emailQueue.process(async (job) => {
    try {
        await this.sendEmail(job.data);
    } catch (error) {
        this.logger.error('Failed to send email', { error, jobData: job.data });
        throw error;
    }
    });
}

private async sendEmail(options: EmailOptions): Promise<void> {
    const { html, text } = await renderTemplate(options.template, options.context);
    
    await this.mailer.sendMail({
    to: options.to,
    subject: options.subject,
    html,
    text
    });
}

async sendEnrollmentConfirmation(user: User, course: Course): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Enrolled: ${course.title}`,
    template: 'enrollment-confirmation',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        courseStart: course.startDate,
        instructorName: course.instructor.name
    }
    });
}

async sendWaitlistConfirmation(user: User, course: Course, position: number): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Waitlisted: ${course.title}`,
    template: 'waitlist-confirmation',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        position,
        estimatedEnrollmentDate: course.estimateWaitlistClearance(position)
    }
    });
}

async sendWaitlistPromotion(user: User, course: Course): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Spot Available: ${course.title}`,
    template: 'waitlist-promotion',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        enrollmentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        enrollmentLink: `${process.env.APP_URL}/courses/${course.id}/enroll`
    }
    });
}

async sendProgressMilestone(user: User, course: Course, progress: number): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `${progress}% Complete: ${course.title}`,
    template: 'progress-milestone',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        progress,
        nextModule: course.getNextModule(progress)
    }
    });
}

async sendCourseCompletion(user: User, course: Course): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Congratulations! Completed: ${course.title}`,
    template: 'course-completion',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        completionDate: new Date(),
        certificateLink: `${process.env.APP_URL}/certificates/${course.id}`
    }
    });
}

async sendCourseReminder(user: User, course: Course): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Reminder: ${course.title} starts soon`,
    template: 'course-reminder',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        startDate: course.startDate,
        courseLink: `${process.env.APP_URL}/courses/${course.id}`
    }
    });
}

async sendUnenrollmentConfirmation(user: User, course: Course): Promise<void> {
    await this.emailQueue.add({
    to: user.email,
    subject: `Unenrolled: ${course.title}`,
    template: 'unenrollment-confirmation',
    context: {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        refundAmount: course.calculateRefund(user),
        supportEmail: process.env.SUPPORT_EMAIL
    }
    });
}

/**
* Creates a new notification for a user
* @param userId - The ID of the user to notify
* @param type - The type of notification
* @param title - Notification title
* @param message - Notification message
* @param metadata - Additional data related to the notification
* @returns The created notification
*/
/**
* Creates a new notification with enhanced tracking and priority
* @param userId - The ID of the user to notify
* @param type - The type of notification
* @param priority - The priority level of the notification
* @param title - Notification title
* @param message - Notification message
* @param metadata - Additional data related to the notification
* @param options - Additional options for the notification
* @returns The created notification
*/
async createNotification(
    userId: string,
    type: NotificationType,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    title: string,
    message: string,
    metadata: Record<string, any> = {},
    options: {
        scheduledFor?: Date;
        ttl?: number;
        templateVersion?: string;
    } = {}
): Promise<Notification>
const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    priority,
    title,
    message,
    metadata,
    isRead: false,
    isSent: false,
    isDelivered: false,
    createdAt: new Date(),
    scheduledFor: options.scheduledFor,
    templateVersion: options.templateVersion,
    ttl: options.ttl,
    retryCount: 0
};

this.notifications.push(notification);

const prefs = this.notificationPreferences.get(userId);
if (prefs?.enabled && prefs.channels[type]) {
    try {
        for (const channel of prefs.channels[type]) {
            await this.deliverNotification(notification, channel);
            notification.isSent = true;
            notification.isDelivered = true;
            notification.deliveredAt = new Date();
            this.logger.info('Notification delivered', { 
                notificationId: notification.id,
                channel,
                userId: notification.userId
            });
        }
    } catch (error) {
        notification.error = error.message;
        notification.retryCount++;
        this.logger.error('Failed to deliver notification', {
            notificationId: notification.id,
            error,
            retryCount: notification.retryCount
        });
        
        if (notification.retryCount < 3 && notification.priority >= NotificationPriority.HIGH) {
            // Re-queue high priority notifications for retry
            await this.retryNotification(notification);
        }
    }
}

return notification;
}

/**
* Sends a notification through a specific channel
* @param notification - The notification to deliver
* @param channel - The channel to use for delivery
*/
private async deliverNotification(
notification: Notification,
channel: NotificationChannel
): Promise<void> {
switch (channel) {
    case NotificationChannel.EMAIL:
    await this.emailQueue.add({
        to: notification.metadata.userEmail,
        subject: notification.title,
        template: `notification-${notification.type.toLowerCase()}`,
        context: {
        ...notification.metadata,
        message: notification.message
        }
    });
    break;
    case NotificationChannel.IN_APP:
    // Handle in-app notification (e.g., store in DB)
    break;
    case NotificationChannel.PUSH:
    // Handle push notification
    break;
}
}

/**
* Retries a failed notification delivery
* @param notification - The notification to retry
*/
private async retryNotification(notification: Notification): Promise<void> {
    const retryDelay = Math.pow(2, notification.retryCount) * 1000; // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    const prefs = this.notificationPreferences.get(notification.userId);
    if (prefs?.enabled && prefs.channels[notification.type]) {
        for (const channel of prefs.channels[notification.type]) {
            await this.deliverNotification(notification, channel);
        }
    }
}

/**
* Gets notification analytics for a user
* @param userId - The user ID
* @returns Analytics data about user's notifications
*/
async getNotificationAnalytics(userId: string): Promise<{
    total: number;
    read: number;
    unread: number;
    delivered: number;
    failed: number;
    averageReadTime: number;
}> {
    const userNotifications = this.notifications.filter(n => n.userId === userId);
    const readNotifications = userNotifications.filter(n => n.isRead);
    
    let totalReadTime = 0;
    for (const notification of readNotifications) {
        if (notification.readAt && notification.deliveredAt) {
            totalReadTime += notification.readAt.getTime() - notification.deliveredAt.getTime();
        }
    }
    
    return {
        total: userNotifications.length,
        read: readNotifications.length,
        unread: userNotifications.length - readNotifications.length,
        delivered: userNotifications.filter(n => n.isDelivered).length,
        failed: userNotifications.filter(n => !!n.error).length,
        averageReadTime: readNotifications.length ? totalReadTime / readNotifications.length : 0
    };
}

/**
* Updates notification preferences for a user
* @param userId - The user ID
* @param preferences - The new notification preferences
*/
async updateNotificationPreferences(
userId: string,
preferences: NotificationPreferences
): Promise<void> {
this.notificationPreferences.set(userId, preferences);
}

/**
* Marks notifications as read
* @param notificationIds - Array of notification IDs to mark as read
*/
async markAsRead(notificationIds: string[]): Promise<void> {
    const now = new Date();
    this.notifications = this.notifications.map(notification => 
        notificationIds.includes(notification.id) 
        ? { ...notification, isRead: true, readAt: now }
        : notification
    );
}

/**
* Queries notifications based on filters
* @param query - Query parameters for filtering notifications
* @returns Filtered notifications with pagination
*/
async queryNotifications(query: NotificationQuery): Promise<{
notifications: Notification[];
total: number;
}> {
let filtered = this.notifications.filter(n => n.userId === query.userId);

if (query.types) {
    filtered = filtered.filter(n => query.types.includes(n.type));
}

if (query.isRead !== undefined) {
    filtered = filtered.filter(n => n.isRead === query.isRead);
}

if (query.startDate) {
    filtered = filtered.filter(n => n.createdAt >= query.startDate);
}

if (query.endDate) {
    filtered = filtered.filter(n => n.createdAt <= query.endDate);
}

const total = filtered.length;
const page = query.page || 1;
const limit = query.limit || 10;
const start = (page - 1) * limit;

return {
    notifications: filtered.slice(start, start + limit),
    total
};
}

/**
* Sends bulk notifications to multiple users
* @param userIds - Array of user IDs to notify
* @param type - The type of notification
* @param title - Notification title
* @param message - Notification message
* @param metadata - Additional data for the notifications
*/
async sendBulkNotifications(
userIds: string[],
type: NotificationType,
title: string,
message: string,
metadata: Record<string, any> = {}
): Promise<void> {
await Promise.all(
    userIds.map(userId => 
    this.createNotification(userId, type, title, message, metadata)
    )
);
}
}
}

export const notificationService = new NotificationService();

