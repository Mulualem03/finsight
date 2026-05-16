import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface RefreshPayload {
  sub: string;
  email: string;
  jti: string;
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request): string | null => {
        const token = req?.cookies?.['fs_refresh'];
        return typeof token === 'string' ? token : null;
      },
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: RefreshPayload,
  ): Promise<{ id: string; email: string; jti: string; rawToken: string }> {
    const rawToken = req?.cookies?.['fs_refresh'];
    if (!rawToken || !payload?.jti) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, jti: payload.jti, rawToken };
  }
}
