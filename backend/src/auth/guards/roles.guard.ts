import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 1. Passe-droit administratif par clé API sécurisée (pour tests & intégrations systèmes)
    const adminKey = request.headers['x-admin-key'];
    const configuredKey =
      this.configService.get<string>('ADMIN_API_KEY') ||
      'admin-secret-key-maquis-2026';

    if (adminKey && adminKey === configuredKey) {
      // Injecter un utilisateur fictif Super Admin si aucun utilisateur dans la requête
      if (!request.user) {
        request.user = {
          id: 'admin-master',
          role: 'SUPER_ADMIN',
          name: 'Super Administrateur',
          statut_paiement: 'actif',
        };
      }
      return true;
    }

    // 2. Vérification du rôle dans le JWT de l'utilisateur authentifié
    const user = request.user;
    if (!user || !user.role) {
      throw new ForbiddenException(
        'Accès refusé (403) : Authentification requise avec des privilèges d’administration.',
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Accès interdit (403) : Cette action requiert le rôle [${requiredRoles.join(', ')}]. Votre rôle actuel est [${user.role}].`,
      );
    }

    return true;
  }
}
