import express, { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { UserController } from '../controllers/userController';
import { validateRequest } from '../middleware/validation';
import { registrationSchema, loginSchema, updateProfileSchema } from '../validation/userSchema';

const router: Router = express.Router();
const userController = new UserController();

// Rate limiting configurations
const authLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 5 // 5 requests per window
});

const standardLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
max: 100
});

// Public routes
router.post('/register', 
authLimiter,
validateRequest(registrationSchema), 
userController.register
);

router.post('/login', 
authLimiter,
validateRequest(loginSchema), 
userController.login
);

router.get('/verify-email/:token', 
authLimiter,
userController.verifyEmail
);

router.post('/forgot-password',
authLimiter,
validateRequest(z.object({ email: z.string().email() })),
userController.forgotPassword
);

router.post('/reset-password/:token',
authLimiter,
validateRequest(passwordChangeSchema),
userController.resetPassword
);

// Authenticated routes
router.get('/profile',
standardLimiter,
requireAuth,
userController.getCurrentUserProfile
);

router.put('/profile',
standardLimiter,
requireAuth,
validateRequest(updateProfileSchema),
userController.updateProfile
);

router.put('/profile/password',
authLimiter,
requireAuth,
validateRequest(passwordChangeSchema),
userController.updatePassword
);

router.put('/profile/email',
authLimiter,
requireAuth,
validateRequest(emailUpdateSchema),
userController.updateEmail
);

router.delete('/profile',
authLimiter,
requireAuth,
validateRequest(z.object({ password: z.string() })),
userController.deleteProfile
);

// Admin-only routes
router.get('/',
standardLimiter,
requireAuth,
requireAdmin,
validateRequest(userQuerySchema),
userController.getAllUsers
);

router.get('/:id',
standardLimiter,
requireAuth,
requireAdmin,
userController.getUserById
);

router.put('/:id',
standardLimiter,
requireAuth,
requireAdmin,
validateRequest(adminUserUpdateSchema),
userController.updateUser
);

router.delete('/:id',
standardLimiter,
requireAuth,
requireAdmin,
userController.deleteUser
);

router.put('/:id/status',
standardLimiter,
requireAuth,
requireAdmin,
validateRequest(z.object({ status: z.enum(['active', 'suspended', 'inactive']) })),
userController.updateUserStatus
);

router.put('/:id/role',
standardLimiter,
requireAuth,
requireAdmin,
validateRequest(z.object({ role: z.enum(['user', 'admin', 'moderator']) })),
userController.updateUserRole
);

export default router;

export default router;
