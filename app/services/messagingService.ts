import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { NotificationService } from './notificationService';
import { User } from '../models/User';
import { AppError } from '../utils/errors';

interface Message {
id: string;
senderId: string;
recipientId?: string;
courseId?: string;
content: string;
type: 'direct' | 'course' | 'announcement' | 'group';
attachments?: string[];
createdAt: Date;
updatedAt: Date;
readBy: string[];
threadId?: string;
isModerated: boolean;
}

interface ChatRoom {
id: string;
type: 'course' | 'group';
participants: string[];
messages: Message[];
createdAt: Date;
}

class MessagingService extends EventEmitter {
private wsServer: WebSocket.Server;
private clients: Map<string, WebSocket> = new Map();
private userStatus: Map<string, boolean> = new Map();
private messageQueue: Map<string, Message[]> = new Map();
private notificationService: NotificationService;

constructor(notificationService: NotificationService) {
    super();
    this.notificationService = notificationService;
    this.setupWebSocket();
}

private setupWebSocket() {
    this.wsServer = new WebSocket.Server({ noServer: true });
    this.wsServer.on('connection', this.handleConnection.bind(this));
}

private handleConnection(ws: WebSocket, userId: string) {
    this.clients.set(userId, ws);
    this.userStatus.set(userId, true);
    this.emitUserStatus(userId, true);

    ws.on('message', (data: string) => this.handleMessage(userId, data));
    ws.on('close', () => this.handleDisconnection(userId));

    // Send queued messages if any
    const queuedMessages = this.messageQueue.get(userId) || [];
    queuedMessages.forEach(msg => this.sendMessage(msg));
    this.messageQueue.delete(userId);
}

private handleDisconnection(userId: string) {
    this.clients.delete(userId);
    this.userStatus.set(userId, false);
    this.emitUserStatus(userId, false);
}

private async handleMessage(senderId: string, data: string) {
    try {
    const message = JSON.parse(data) as Message;
    message.senderId = senderId;
    message.createdAt = new Date();
    message.updatedAt = new Date();
    message.readBy = [senderId];

    await this.persistMessage(message);
    await this.sendMessage(message);

    if (message.type === 'course' || message.type === 'announcement') {
        await this.notifyParticipants(message);
    }
    } catch (error) {
    this.handleError(senderId, error);
    }
}

private async sendMessage(message: Message) {
    const recipientId = message.recipientId;
    const recipientWs = recipientId ? this.clients.get(recipientId) : null;

    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
    recipientWs.send(JSON.stringify(message));
    } else if (recipientId) {
    // Queue message for offline user
    const userQueue = this.messageQueue.get(recipientId) || [];
    userQueue.push(message);
    this.messageQueue.set(recipientId, userQueue);
    
    // Send push notification
    await this.notificationService.sendMessageNotification(message);
    }
}

private async persistMessage(message: Message) {
    // Implement message persistence to database
    try {
    // Database operations here
    return message;
    } catch (error) {
    throw new AppError('Failed to persist message', 500);
    }
}

public async sendDirectMessage(senderId: string, recipientId: string, content: string, attachments?: string[]) {
    const message: Message = {
    id: crypto.randomUUID(),
    senderId,
    recipientId,
    content,
    type: 'direct',
    attachments,
    createdAt: new Date(),
    updatedAt: new Date(),
    readBy: [senderId],
    isModerated: false
    };

    await this.handleMessage(senderId, JSON.stringify(message));
}

public async sendCourseAnnouncement(courseId: string, senderId: string, content: string) {
    const message: Message = {
    id: crypto.randomUUID(),
    senderId,
    courseId,
    content,
    type: 'announcement',
    createdAt: new Date(),
    updatedAt: new Date(),
    readBy: [senderId],
    isModerated: true
    };

    await this.handleMessage(senderId, JSON.stringify(message));
}

private emitUserStatus(userId: string, isOnline: boolean) {
    const statusUpdate = {
    userId,
    status: isOnline ? 'online' : 'offline',
    timestamp: new Date()
    };

    this.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'status', data: statusUpdate }));
    }
    });
}

private async notifyParticipants(message: Message) {
    if (message.type === 'course' && message.courseId) {
    // Notify course participants
    // Implementation here
    }
    await this.notificationService.sendMessageNotification(message);
}

private handleError(userId: string, error: any) {
    const errorMessage = {
    type: 'error',
    message: error.message || 'An error occurred',
    timestamp: new Date()
    };

    const userWs = this.clients.get(userId);
    if (userWs && userWs.readyState === WebSocket.OPEN) {
    userWs.send(JSON.stringify(errorMessage));
    }
}

public async getMessageHistory(userId: string, options: { type?: string, limit?: number, offset?: number }) {
    // Implement message history retrieval from database
    try {
    // Database query here
    return [];
    } catch (error) {
    throw new AppError('Failed to retrieve message history', 500);
    }
}

public async searchMessages(userId: string, query: string) {
    // Implement message search
    try {
    // Search implementation here
    return [];
    } catch (error) {
    throw new AppError('Failed to search messages', 500);
    }
}
}

export default MessagingService;

