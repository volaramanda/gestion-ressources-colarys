// backend/src/auth/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Ajoutez votre logique d'authentification personnalisée ici
    // Par exemple, vérifier des permissions spécifiques
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Vous pouvez lancer une exception basée sur les informations "info" ou "err"
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed');
    }
    return user;
  }
}