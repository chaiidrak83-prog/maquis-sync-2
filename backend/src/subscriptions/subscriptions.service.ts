import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  /**
   * Initialise une nouvelle souscription avec le statut 'en_attente'
   */
  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepo.create({
      user_name: dto.userName,
      phone: dto.phone,
      establishment_name: dto.establishmentName || 'Mon Maquis',
      plan: dto.plan,
      montant: dto.montant,
      statut_paiement: 'en_attente',
      expo_push_token: dto.expoPushToken,
      user_id: dto.userId,
    });

    const saved = await this.subscriptionRepo.save(subscription);
    this.logger.log(
      `Nouvelle souscription initiée [ID: ${saved.id}] - Plan: ${saved.plan} (${saved.montant} FCFA) pour ${saved.user_name} (${saved.phone})`,
    );
    return saved;
  }

  /**
   * Récupère le statut actuel d'une souscription (pour le polling du client)
   */
  async getStatus(id: string): Promise<{
    id: string;
    statut_paiement: string;
    plan: string;
    montant: number;
    validated_at: Date | null;
  }> {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Souscription avec l'ID ${id} non trouvée`);
    }

    return {
      id: sub.id,
      statut_paiement: sub.statut_paiement,
      plan: sub.plan,
      montant: sub.montant,
      validated_at: sub.validated_at,
    };
  }

  /**
   * Récupère toutes les souscriptions en attente de validation
   */
  async getPending(): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      where: { statut_paiement: 'en_attente' },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Valide et active une souscription, puis envoie la notification push Expo
   */
  async activate(id: string): Promise<{
    success: boolean;
    subscription: Subscription;
    pushNotificationSent: boolean;
    pushMessage?: string;
  }> {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Souscription avec l'ID ${id} non trouvée`);
    }

    // 1. Mise à jour du statut en base de données
    sub.statut_paiement = 'actif';
    sub.validated_at = new Date();
    const updated = await this.subscriptionRepo.save(sub);
    this.logger.log(`Souscription [ID: ${id}] validée avec succès pour ${sub.user_name}`);

    // 2. Envoi de la notification push via Expo Server SDK
    let pushSent = false;
    const notificationBody =
      'Abonnement activé : Votre paiement a été validé. Vous pouvez maintenant utiliser votre application !';

    if (sub.expo_push_token) {
      pushSent = await this.sendPushNotification(
        sub.expo_push_token,
        'Abonnement activé',
        notificationBody,
        {
          subscriptionId: sub.id,
          plan: sub.plan,
          statut: 'actif',
        },
      );
    } else {
      this.logger.warn(`Aucun Push Token Expo enregistré pour la souscription ${id}`);
    }

    return {
      success: true,
      subscription: updated,
      pushNotificationSent: pushSent,
      pushMessage: notificationBody,
    };
  }

  /**
   * Envoie un message push Expo à un token donné
   */
  private async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ): Promise<boolean> {
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.error(`Le token push "${pushToken}" n'est pas un token Expo valide`);
      return false;
    }

    const messages: ExpoPushMessage[] = [
      {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
      },
    ];

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      this.logger.log(`Push notification envoyée avec succès à ${pushToken}:`, tickets);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de la notification push à ${pushToken}:`, error);
      return false;
    }
  }
}
