// backend/src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    // Vous pouvez ajouter une validation supplémentaire ici
    // Par exemple, vérifier si l'utilisateur existe toujours en base de données
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return { 
      userId: payload.sub, 
      username: payload.username,
      role: payload.role || 'user' 
    };
  }
}