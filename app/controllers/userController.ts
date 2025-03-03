import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { IUser } from '../models/User';

export interface IUserController {
// Registration and Authentication
register(req: Request, res: Response): Promise<void>;
verifyEmail(req: Request, res: Response): Promise<void>;
resendVerification(req: Request, res: Response): Promise<void>;
login(req: Request, res: Response): Promise<void>;
logout(req: Request, res: Response): Promise<void>;

// Profile Management
getCurrentUserProfile(req: Request, res: Response): Promise<void>;
updateProfile(req: Request, res: Response): Promise<void>;
changePassword(req: Request, res: Response): Promise<void>;
updateEmail(req: Request, res: Response): Promise<void>;

// Account Operations
deactivateAccount(req: Request, res: Response): Promise<void>;
reactivateAccount(req: Request, res: Response): Promise<void>;
deleteAccount(req: Request, res: Response): Promise<void>;
updateEmailPreferences(req: Request, res: Response): Promise<void>;

// Admin Operations
getAllUsers(req: Request, res: Response): Promise<void>;
getUserById(req: Request, res: Response): Promise<void>;
updateUserRole(req: Request, res: Response): Promise<void>;
updateUserStatus(req: Request, res: Response): Promise<void>;
}

export class UserController implements IUserController {
constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly validationService: ValidationService,
    private readonly emailService: EmailService,
    private readonly logger: Logger
) {}

  private generateToken(userId: string): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
  }

public register = async (req: Request, res: Response): Promise<void> => {
try {
    this.logger.info('Starting user registration process');
    await this.validationService.validateRegistration(req.body);
    const { email, password, username } = req.body;

    // Check for existing user
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
    throw new ConflictError('Email already registered');
    }

    // Hash password and create user
    const hashedPassword = await this.authService.hashPassword(password);
    const result = await this.userService.register({
    email,
    password: hashedPassword,
    username,
    status: 'pending',
    emailVerified: false
    });

    // Generate verification token and send email
    const verificationToken = await this.authService.generateVerificationToken(result.user._id);
    await this.emailService.sendVerificationEmail(email, verificationToken);

    this.logger.info(`User registered successfully: ${result.user._id}`);
    res.status(201).json({
    message: 'Registration successful. Please check your email for verification.',
    user: {
        id: result.user._id,
        email: result.user.email,
        username: result.user.username,
        status: result.user.status
    }
    });
    } catch (error) {
      if (error.name === 'ValidationError') {
        res
          .status(400)
          .json({ message: 'Validation error', errors: error.errors });
      } else if (error.code === 11000) {
        res.status(409).json({ message: 'Email already exists' });
      } else {
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
  };

public login = async (req: Request, res: Response): Promise<void> => {
try {
    this.logger.info('Processing login request');
    await this.validationService.validateLogin(req.body);
    const { email, password } = req.body;

    // Verify credentials and user status
    const user = await this.userService.findByEmail(email);
    if (!user) {
    throw new AuthenticationError('Invalid credentials');
    }

    if (!user.emailVerified) {
    throw new ValidationError('Email not verified. Please verify your email first.');
    }

    if (user.status === 'deactivated') {
    throw new AuthenticationError('Account is deactivated. Please reactivate your account.');
    }

    // Verify password and generate tokens
    const isValidPassword = await this.authService.verifyPassword(password, user.password);
    if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.authService.generateAuthTokens(user._id);
    
    this.logger.info(`User logged in successfully: ${user._id}`);
    res.json({
    accessToken,
    refreshToken,
    user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status
    }
    });
    } catch (error) {
      if (error.name === 'ValidationError') {
        res.status(400).json({ message: 'Invalid credentials' });
      } else if (error.name === 'AuthenticationError') {
        res.status(401).json({ message: 'Invalid email or password' });
      } else {
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
  };

public getAllUsers = async (req: Request, res: Response): Promise<void> => {
try {
    this.logger.info('Fetching users list with filters');
    const { page = 1, limit = 10, status, role, search } = req.query;

    // Validate admin access
    if (!req.user?.roles.includes('admin')) {
    throw new ForbiddenError('Admin access required');
    }

    const filters = {
    status: status as string,
    role: role as string,
    search: search as string
    };

    const result = await this.userService.getAllUsers({
    page: Number(page),
    limit: Number(limit),
    filters
    });

    this.logger.info(`Retrieved ${result.users.length} users`);
    res.json({
    users: result.users.map((user) => ({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
    })),
    pagination: {
        total: result.total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(result.total / Number(limit))
    }
    });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Access denied' });
      } else {
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
  };

  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.userRepository.findById(req.params.id);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, username, password } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Update user data
      const updateData: Partial<IUser> = { email, username };
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const updatedUser = await this.userRepository.update(userId, updateData);

      res.json({
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await this.userRepository.findById(userId);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      await this.userRepository.delete(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  public getCurrentUserProfile = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user.id;
      const user = await this.userService.getUserById(userId);

      res.json({
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      if (error.name === 'NotFoundError') {
        res.status(404).json({ message: 'Profile not found' });
      } else {
        res.status(500).json({ message: 'Server error', error: error.message });
      }
    }
  };
}
