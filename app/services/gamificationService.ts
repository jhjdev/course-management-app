import { Types } from 'mongoose';
import { ProgressTrackingService } from './progressTrackingService';
import { NotificationService } from './notificationService';
import { EventEmitter } from 'events';

// Interfaces for gamification elements
interface Achievement {
id: string;
name: string;
description: string;
criteria: AchievementCriteria;
icon: string;
points: number;
}

interface AchievementCriteria {
type: 'course_completion' | 'streak' | 'points' | 'custom';
threshold: number;
conditions?: Record<string, any>;
}

interface UserProgress {
userId: Types.ObjectId;
points: number;
level: number;
achievements: string[];
streaks: {
    current: number;
    longest: number;
    lastActive: Date;
};
badges: string[];
}

interface LeaderboardEntry {
userId: Types.ObjectId;
points: number;
rank: number;
achievementCount: number;
}

export class GamificationService {
private eventEmitter: EventEmitter;
private achievementRules: Map<string, Achievement>;
private userProgress: Map<string, UserProgress>;

constructor(
    private progressService: ProgressTrackingService,
    private notificationService: NotificationService
) {
    this.eventEmitter = new EventEmitter();
    this.achievementRules = new Map();
    this.userProgress = new Map();
    this.initializeAchievementRules();
    this.setupEventListeners();
}

private initializeAchievementRules(): void {
    // Initialize default achievements
    const defaultAchievements: Achievement[] = [
    {
        id: 'first_course_complete',
        name: 'Course Pioneer',
        description: 'Complete your first course',
        criteria: { type: 'course_completion', threshold: 1 },
        icon: 'pioneer-badge.png',
        points: 100
    },
    {
        id: 'perfect_streak_week',
        name: 'Week Warrior',
        description: 'Maintain a perfect learning streak for a week',
        criteria: { type: 'streak', threshold: 7 },
        icon: 'streak-badge.png',
        points: 150
    }
    // Add more default achievements
    ];

    defaultAchievements.forEach(achievement => {
    this.achievementRules.set(achievement.id, achievement);
    });
}

private setupEventListeners(): void {
    // Listen for relevant events
    this.eventEmitter.on('course_completed', this.handleCourseCompletion.bind(this));
    this.eventEmitter.on('streak_updated', this.handleStreakUpdate.bind(this));
    this.eventEmitter.on('points_earned', this.handlePointsEarned.bind(this));
}

async awardPoints(userId: Types.ObjectId, points: number, reason: string): Promise<number> {
    const userProgress = await this.getUserProgress(userId);
    userProgress.points += points;
    
    await this.updateUserProgress(userId, userProgress);
    this.eventEmitter.emit('points_earned', { userId, points, reason });
    
    return userProgress.points;
}

async updateStreak(userId: Types.ObjectId): Promise<void> {
    const userProgress = await this.getUserProgress(userId);
    const today = new Date();
    const lastActive = new Date(userProgress.streaks.lastActive);

    if (this.isConsecutiveDay(lastActive, today)) {
    userProgress.streaks.current++;
    userProgress.streaks.longest = Math.max(
        userProgress.streaks.current,
        userProgress.streaks.longest
    );
    } else {
    userProgress.streaks.current = 1;
    }

    userProgress.streaks.lastActive = today;
    await this.updateUserProgress(userId, userProgress);
    this.eventEmitter.emit('streak_updated', userProgress.streaks);
}

async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const entries = Array.from(this.userProgress.entries())
    .map(([userId, progress]) => ({
        userId: new Types.ObjectId(userId),
        points: progress.points,
        achievementCount: progress.achievements.length,
        rank: 0
    }))
    .sort((a, b) => b.points - a.points);

    // Assign ranks
    entries.forEach((entry, index) => {
    entry.rank = index + 1;
    });

    return entries.slice(0, limit);
}

async checkAndAwardAchievements(userId: Types.ObjectId): Promise<string[]> {
    const userProgress = await this.getUserProgress(userId);
    const newAchievements: string[] = [];

    for (const [achievementId, achievement] of this.achievementRules) {
    if (!userProgress.achievements.includes(achievementId) &&
        await this.checkAchievementCriteria(userId, achievement.criteria)) {
        userProgress.achievements.push(achievementId);
        newAchievements.push(achievementId);
        await this.awardPoints(userId, achievement.points, `Achievement: ${achievement.name}`);
        
        await this.notificationService.sendAchievementNotification(
        userId,
        achievement.name,
        achievement.description
        );
    }
    }

    if (newAchievements.length > 0) {
    await this.updateUserProgress(userId, userProgress);
    }

    return newAchievements;
}

private async checkAchievementCriteria(
    userId: Types.ObjectId,
    criteria: AchievementCriteria
): Promise<boolean> {
    switch (criteria.type) {
    case 'course_completion':
        const completedCourses = await this.progressService.getCompletedCourseCount(userId);
        return completedCourses >= criteria.threshold;

    case 'streak':
        const userProgress = await this.getUserProgress(userId);
        return userProgress.streaks.current >= criteria.threshold;

    case 'points':
        const progress = await this.getUserProgress(userId);
        return progress.points >= criteria.threshold;

    case 'custom':
        // Handle custom achievement criteria
        return this.evaluateCustomCriteria(userId, criteria.conditions);

    default:
        return false;
    }
}

private async getUserProgress(userId: Types.ObjectId): Promise<UserProgress> {
    const userIdStr = userId.toString();
    if (!this.userProgress.has(userIdStr)) {
    this.userProgress.set(userIdStr, {
        userId,
        points: 0,
        level: 1,
        achievements: [],
        streaks: {
        current: 0,
        longest: 0,
        lastActive: new Date()
        },
        badges: []
    });
    }
    return this.userProgress.get(userIdStr)!;
}

private async updateUserProgress(
    userId: Types.ObjectId,
    progress: UserProgress
): Promise<void> {
    this.userProgress.set(userId.toString(), progress);
    // Persist to database
}

private isConsecutiveDay(lastActive: Date, current: Date): boolean {
    const dayDiff = Math.floor(
    (current.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    return dayDiff === 1;
}

private async evaluateCustomCriteria(
    userId: Types.ObjectId,
    conditions?: Record<string, any>
): Promise<boolean> {
    // Implement custom criteria evaluation logic
    return false;
}

private async handleCourseCompletion(data: { userId: Types.ObjectId }): Promise<void> {
    await this.checkAndAwardAchievements(data.userId);
}

private async handleStreakUpdate(data: {
    userId: Types.ObjectId,
    streak: number
}): Promise<void> {
    await this.checkAndAwardAchievements(data.userId);
}

private async handlePointsEarned(data: {
    userId: Types.ObjectId,
    points: number
}): Promise<void> {
    await this.checkAndAwardAchievements(data.userId);
}
}

