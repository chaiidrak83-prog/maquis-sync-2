import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ALLOW_PENDING_PAYMENT_KEY } from './allow-pending.decorator';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Injectable()
export class PaymentStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vérifie si la route autorise explicitement les comptes en attente (ex: statut, auth/me)
    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_PAYMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowPending) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si le token indique que le compte est 'en_attente'
    if (user && user.statut_paiement === 'en_attente') {
      // Vérification dynamique : si le compte a été validé en base par le Super Admin
      try {
        const userId = user.sub || user.id;
        const establishmentId = user.establishment_id;

        if (userId) {
          const userRepo = this.dataSource.getRepository('User');
          const dbUser = await userRepo.findOne({ where: { id: userId } });
          if (dbUser && (dbUser as any).statut_paiement === 'actif') {
            user.statut_paiement = 'actif';
            return true;
          }
        }

        if (establishmentId) {
          const estRepo = this.dataSource.getRepository('Establishment');
          const dbEst = await estRepo.findOne({ where: { id: establishmentId } });
          if (dbEst && (dbEst as any).statut_paiement === 'actif') {
            user.statut_paiement = 'actif';
            return true;
          }
        }

        if (user.subscription_id) {
          const subRepo = this.dataSource.getRepository(Subscription);
          const sub = await subRepo.findOne({ where: { id: user.subscription_id } });
          if (sub && sub.statut_paiement === 'actif') {
            user.statut_paiement = 'actif';
            return true;
          }
        }
      } catch (e) {
        // Ignorer l'erreur et procéder au rejet si toujours en_attente
      }

      // Rejet strict avec HTTP 403 Forbidden
      throw new ForbiddenException(
        'Accès interdit (403) : Votre abonnement est en attente de validation de paiement. Veuillez finaliser votre règlement Orange/Moov Money et transmettre votre preuve WhatsApp pour débloquer les modules d’inventaire et de caisse.',
      );
    }

    return true;
  }
}
