import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const MAX_PASSWORD_LENGTH = 72; // bcrypt's maximum length

export class PasswordError extends Error {
constructor(message: string) {
    super(message);
    this.name = 'PasswordError';
}
}

/**
* Validates a password string against security requirements
* @param password The password to validate
* @throws PasswordError if validation fails
*/
function validatePassword(password: string): void {
if (!password) {
    throw new PasswordError('Password cannot be empty');
}

if (typeof password !== 'string') {
    throw new PasswordError('Password must be a string');
}

if (password.length > MAX_PASSWORD_LENGTH) {
    throw new PasswordError(`Password cannot be longer than ${MAX_PASSWORD_LENGTH} characters`);
}

if (password.length < 8) {
    throw new PasswordError('Password must be at least 8 characters long');
}
}

/**
* Hashes a password using bcrypt
* @param password Plain text password to hash
* @returns Promise that resolves to the hashed password
* @throws PasswordError if password is invalid
*/
export async function hashPassword(password: string): Promise<string> {
try {
    validatePassword(password);
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
} catch (error) {
    if (error instanceof PasswordError) {
    throw error;
    }
    throw new PasswordError('Failed to hash password');
}
}

/**
* Compares a plain text password with a hash
* @param password Plain text password to compare
* @param hashedPassword Hashed password to compare against
* @returns Promise that resolves to true if passwords match, false otherwise
* @throws PasswordError if inputs are invalid
*/
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
try {
    if (!hashedPassword) {
    throw new PasswordError('Hashed password cannot be empty');
    }
    
    if (typeof hashedPassword !== 'string') {
    throw new PasswordError('Hashed password must be a string');
    }

    validatePassword(password);
    return await bcrypt.compare(password, hashedPassword);
} catch (error) {
    if (error instanceof PasswordError) {
    throw error;
    }
    throw new PasswordError('Failed to compare passwords');
}
}

