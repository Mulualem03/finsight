export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  encryption: {
    tokenKey: process.env.TOKEN_ENCRYPTION_KEY,
  },
  openBanking: {
    provider: (process.env.OPEN_BANKING_PROVIDER ?? 'mock') as 'truelayer' | 'mock',
    trueLayer: {
      clientId: process.env.TRUELAYER_CLIENT_ID,
      clientSecret: process.env.TRUELAYER_CLIENT_SECRET,
      redirectUri: process.env.TRUELAYER_REDIRECT_URI,
      environment: (process.env.TRUELAYER_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live',
    },
  },
});
