import Stripe from 'stripe';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { PaymentNotFoundError, PaymentProcessingError, RefundError } from '../utils/errors';
import { logger } from '../utils/logger';

interface PaymentProvider {
processPayment(amount: number, currency: string, paymentMethod: string): Promise<any>;
createSubscription(customerId: string, planId: string): Promise<any>;
processRefund(paymentId: string): Promise<any>;
}

interface PaymentPlan {
id: string;
name: string;
amount: number;
currency: string;
interval: 'month' | 'year';
intervalCount: number;
}

interface PaymentTransaction {
id: string;
userId: string;
courseId?: string;
amount: number;
currency: string;
status: 'pending' | 'completed' | 'failed' | 'refunded';
paymentMethod: string;
createdAt: Date;
metadata: Record<string, any>;
}

export class PaymentService {
private stripe: Stripe;
private notificationService: NotificationService;
private analyticsService: AnalyticsService;

constructor(
    stripeSecretKey: string,
    notificationService: NotificationService,
    analyticsService: AnalyticsService
) {
    this.stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    this.notificationService = notificationService;
    this.analyticsService = analyticsService;
}

async processCoursePayment(
    user: User,
    course: Course,
    paymentMethod: string
): Promise<PaymentTransaction> {
    try {
    const paymentIntent = await this.stripe.paymentIntents.create({
        amount: course.price * 100, // Convert to cents
        currency: 'usd',
        payment_method: paymentMethod,
        customer: user.stripeCustomerId,
        metadata: {
        courseId: course.id,
        userId: user.id
        }
    });

    const transaction: PaymentTransaction = {
        id: paymentIntent.id,
        userId: user.id,
        courseId: course.id,
        amount: course.price,
        currency: 'usd',
        status: 'pending',
        paymentMethod,
        createdAt: new Date(),
        metadata: paymentIntent.metadata
    };

    await this.notificationService.sendPaymentConfirmation(user.email, transaction);
    await this.analyticsService.trackPayment(transaction);

    return transaction;
    } catch (error) {
    logger.error('Payment processing failed:', error);
    throw new PaymentProcessingError('Failed to process payment');
    }
}

async createSubscription(
    user: User,
    planId: string
): Promise<any> {
    try {
    const subscription = await this.stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: planId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
    });

    await this.notificationService.sendSubscriptionConfirmation(user.email, subscription);
    await this.analyticsService.trackSubscription(subscription);

    return subscription;
    } catch (error) {
    logger.error('Subscription creation failed:', error);
    throw new PaymentProcessingError('Failed to create subscription');
    }
}

async processRefund(
    transactionId: string,
    reason?: string
): Promise<any> {
    try {
    const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        reason: reason as Stripe.RefundCreateParams.Reason
    });

    await this.notificationService.sendRefundConfirmation(transactionId, refund);
    await this.analyticsService.trackRefund(refund);

    return refund;
    } catch (error) {
    logger.error('Refund processing failed:', error);
    throw new RefundError('Failed to process refund');
    }
}

async verifyPayment(paymentId: string): Promise<PaymentTransaction> {
    try {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
    
    return {
        id: paymentIntent.id,
        userId: paymentIntent.metadata.userId,
        courseId: paymentIntent.metadata.courseId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: this.mapPaymentStatus(paymentIntent.status),
        paymentMethod: paymentIntent.payment_method as string,
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata
    };
    } catch (error) {
    logger.error('Payment verification failed:', error);
    throw new PaymentNotFoundError('Payment not found');
    }
}

async getTransactionHistory(userId: string): Promise<PaymentTransaction[]> {
    try {
    const paymentIntents = await this.stripe.paymentIntents.list({
        customer: userId,
        limit: 100
    });

    return paymentIntents.data.map(pi => ({
        id: pi.id,
        userId: pi.metadata.userId,
        courseId: pi.metadata.courseId,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: this.mapPaymentStatus(pi.status),
        paymentMethod: pi.payment_method as string,
        createdAt: new Date(pi.created * 1000),
        metadata: pi.metadata
    }));
    } catch (error) {
    logger.error('Failed to fetch transaction history:', error);
    throw new PaymentProcessingError('Failed to fetch transaction history');
    }
}

private mapPaymentStatus(stripeStatus: string): 'pending' | 'completed' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'completed' | 'failed' | 'refunded'> = {
    'requires_payment_method': 'pending',
    'requires_confirmation': 'pending',
    'requires_action': 'pending',
    'processing': 'pending',
    'succeeded': 'completed',
    'canceled': 'failed',
    'refunded': 'refunded'
    };
    return statusMap[stripeStatus] || 'failed';
}
}

