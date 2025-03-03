import { Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { AuthenticationError, ValidationError, NotFoundError } from '../utils/errors';

interface IUserRegistration {
email: string;
password: string;
firstName: string;
lastName: string;
role?: 'student' | 'instructor' | 'admin';
}

interface IUserUpdate {
firstName?: string;
lastName?: string;
email?: string;
}

interface ILoginCredentials {
email: string;
password: string;
}

interface IPaginationOptions {
page?: number;
limit?: number;
}

export class UserService {
private userModel: Model<IUser>;

constructor(userModel: Model<IUser>) {
    this.userModel = userModel;
}

async register(userData: IUserRegistration): Promise<{ user: IUser; token: string }> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: userData.email });
    if (existingUser) {
    throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create new user
    const user = new this.userModel({
    ...userData,
    password: hashedPassword,
    role: userData.role || 'student'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({ userId: user._id, role: user.role });

    // Return user (without password) and token
    const userObject = user.toObject();
    delete userObject.password;

    return { user: userObject, token };
}

async login(credentials: ILoginCredentials): Promise<{ user: IUser; token: string }> {
    // Find user by email
    const user = await this.userModel.findOne({ email: credentials.email });
    if (!user) {
    throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await comparePassword(credentials.password, user.password);
    if (!isValid) {
    throw new AuthenticationError('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken({ userId: user._id, role: user.role });

    // Return user (without password) and token
    const userObject = user.toObject();
    delete userObject.password;

    return { user: userObject, token };
}

async getUser(id: string): Promise<IUser> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
    throw new NotFoundError('User not found');
    }
    return user;
}

async updateUser(id: string, updateData: IUserUpdate): Promise<IUser> {
    // Check if email is being updated and if it's already taken
    if (updateData.email) {
    const existingUser = await this.userModel.findOne({ 
        email: updateData.email,
        _id: { $ne: id }
    });
    if (existingUser) {
        throw new ValidationError('Email already in use');
    }
    }

    const user = await this.userModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
    throw new NotFoundError('User not found');
    }

    return user;
}

async deleteUser(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
    throw new NotFoundError('User not found');
    }
}

async getUsers(options: IPaginationOptions = {}): Promise<{ users: IUser[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
    this.userModel.find()
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
    this.userModel.countDocuments()
    ]);

    return { users, total };
}
}

