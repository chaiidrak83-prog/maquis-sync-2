import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Endpoint client : Initialiser une nouvelle souscription avec statut 'en_attente'
   */
  @Post('subscriptions/subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  /**
   * Endpoint client : Vérifier le statut de la souscription pour le polling
   */
  @Get('subscriptions/status/:id')
  async getStatus(@Param('id') id: string) {
    return this.subscriptionsService.getStatus(id);
  }

  /**
   * Endpoint administration : Lister les comptes 'en_attente' avec détails du plan
   */
  @Get('admin/subscriptions/pending')
  async getPending(@Headers('x-admin-key') adminKey?: string) {
    // Sécurisation basique par clé secrète d'administration (optionnelle en mode dev)
    const expectedKey = process.env.ADMIN_API_KEY || 'admin-secret-key-maquis-2026';
    if (adminKey && adminKey !== expectedKey) {
      throw new UnauthorizedException('Clé API Administrateur non valide');
    }

    return this.subscriptionsService.getPending();
  }

  /**
   * Endpoint administration : Passer un compte en statut 'actif' et envoyer la notification push Expo
   */
  @Patch('admin/subscriptions/:id/activate')
  async activate(
    @Param('id') id: string,
    @Headers('x-admin-key') adminKey?: string,
  ) {
    const expectedKey = process.env.ADMIN_API_KEY || 'admin-secret-key-maquis-2026';
    if (adminKey && adminKey !== expectedKey) {
      throw new UnauthorizedException('Clé API Administrateur non valide');
    }

    return this.subscriptionsService.activate(id);
  }
}
