import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn() },
            refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.accessSecret': 'a'.repeat(64),
                'jwt.refreshSecret': 'b'.repeat(64),
                'jwt.accessTtl': '15m',
                'jwt.refreshTtl': '7d',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
  });

  describe('register', () => {
    it('rejects duplicate emails', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'taken@example.com', password: 'StrongPass1!' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a user with a bcrypt-hashed password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(async ({ data }) => ({
        id: data.id,
        email: data.email,
      }));

      const result = await service.register({
        email: 'new@example.com',
        password: 'StrongPass1!',
      });

      expect(result.email).toBe('new@example.com');
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('StrongPass1!');
      expect(await bcrypt.compare('StrongPass1!', createCall.data.passwordHash)).toBe(true);
    });
  });

  describe('login', () => {
    it('rejects unknown email with the same error as wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const start = Date.now();
      await expect(
        service.login({ email: 'unknown@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      // The constant-time bcrypt compare adds latency even for unknown users
      expect(Date.now() - start).toBeGreaterThan(10);
    });

    it('issues tokens on correct credentials', async () => {
      const passwordHash = await bcrypt.hash('correctHorse', 4);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'me@example.com',
        passwordHash,
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.login({ email: 'me@example.com', password: 'correctHorse' });

      expect(result.user.id).toBe('user-1');
      expect(result.tokens.accessToken).toBe('signed-token');
      expect(jwt.signAsync).toHaveBeenCalledTimes(2); // access + refresh
    });
  });
});
