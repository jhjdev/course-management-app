import { hashPassword, comparePassword } from '../../app/utils/password';
import bcrypt from 'bcrypt';

// Mock bcrypt to control salt generation and timing
jest.mock('bcrypt', () => ({
hash: jest.fn(),
compare: jest.fn(),
genSalt: jest.fn(),
}));

describe('Password Utils', () => {
beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockImplementation((password, salt) => 
    Promise.resolve(`hashed_${password}_${salt}`));
    (bcrypt.compare as jest.Mock).mockImplementation((password, hash) => 
    Promise.resolve(hash === `hashed_${password}_10`));
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('10');
});

describe('hashPassword', () => {
    it('should hash password successfully', async () => {
    const password = 'test123';
    const hash = await hashPassword(password);
    expect(hash).toBe('hashed_test123_10');
    expect(bcrypt.hash).toHaveBeenCalledWith(password, '10');
    });

    it('should generate different hashes for same password', async () => {
    const password = 'test123';
    (bcrypt.genSalt as jest.Mock)
        .mockResolvedValueOnce('10')
        .mockResolvedValueOnce('11');
    
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
    });

    it('should reject empty passwords', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should handle very long passwords', async () => {
    const longPassword = 'a'.repeat(73);
    await expect(hashPassword(longPassword)).rejects.toThrow('Password too long');
    });

    it('should handle special characters', async () => {
    const specialPassword = '!@#$%^&*()_+';
    const hash = await hashPassword(specialPassword);
    expect(hash).toBe('hashed_!@#$%^&*()_+_10');
    });
});

describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
    const password = 'test123';
    const hash = 'hashed_test123_10';
    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
    const password = 'test123';
    const hash = 'hashed_wrongpass_10';
    const result = await comparePassword(password, hash);
    expect(result).toBe(false);
    });

    it('should be case sensitive', async () => {
    const password = 'Test123';
    const hash = 'hashed_test123_10';
    const result = await comparePassword(password, hash);
    expect(result).toBe(false);
    });

    it('should reject empty passwords', async () => {
    await expect(comparePassword('', 'somehash'))
        .rejects.toThrow('Password cannot be empty');
    });

    it('should reject null/undefined passwords', async () => {
    await expect(comparePassword(null as any, 'somehash'))
        .rejects.toThrow('Invalid password');
    await expect(comparePassword(undefined as any, 'somehash'))
        .rejects.toThrow('Invalid password');
    });
});

describe('Security Aspects', () => {
    it('should use unique salt for each hash', async () => {
    const password = 'test123';
    (bcrypt.genSalt as jest.Mock)
        .mockResolvedValueOnce('salt1')
        .mockResolvedValueOnce('salt2');
    
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
    expect(bcrypt.genSalt).toHaveBeenCalledTimes(2);
    });

    it('should maintain constant time comparison', async () => {
    const startTime = process.hrtime();
    await comparePassword('shortpass', 'hashed_shortpass_10');
    const shortTime = process.hrtime(startTime);

    const startTime2 = process.hrtime();
    await comparePassword('verylongpassword', 'hashed_verylongpassword_10');
    const longTime = process.hrtime(startTime2);

    // Allow for small variations but should be roughly similar
    expect(Math.abs(shortTime[1] - longTime[1])).toBeLessThan(1000000);
    });
});
});

