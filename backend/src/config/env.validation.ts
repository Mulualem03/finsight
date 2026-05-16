import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum OpenBankingProvider {
  TrueLayer = 'truelayer',
  Mock = 'mock',
}

class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsInt()
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 chars' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 chars' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @MinLength(40, { message: 'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key' })
  TOKEN_ENCRYPTION_KEY!: string;

  @IsEnum(OpenBankingProvider)
  OPEN_BANKING_PROVIDER!: OpenBankingProvider;

  @IsOptional() @IsString() TRUELAYER_CLIENT_ID?: string;
  @IsOptional() @IsString() TRUELAYER_CLIENT_SECRET?: string;
  @IsOptional() @IsString() TRUELAYER_REDIRECT_URI?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`,
    );
  }
  return validated;
}
