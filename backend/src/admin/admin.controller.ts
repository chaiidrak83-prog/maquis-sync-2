import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Endpoint d'analyses de données approfondies (MRR, churn, rétention, dormance)
   */
  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  /**
   * Liste complète (DataGrid) des comptes et établissements
   */
  @Get('accounts')
  async getAccounts(@Query('filter') filter?: string) {
    return this.adminService.getAccounts(filter);
  }

  /**
   * Validation d'un paiement en attente avec notification push automatique
   */
  @Patch('accounts/:id/validate')
  async validateAccount(@Param('id') id: string) {
    return this.adminService.validateAccount(id);
  }

  /**
   * Suspension opérationnelle d'un compte
   */
  @Patch('accounts/:id/suspend')
  async suspendAccount(@Param('id') id: string) {
    return this.adminService.suspendAccount(id);
  }

  /**
   * Réactivation d'un compte suspendu
   */
  @Patch('accounts/:id/reactivate')
  async reactivateAccount(@Param('id') id: string) {
    return this.adminService.reactivateAccount(id);
  }

  /**
   * Modification du forfait (Découverte 9900, Accès 14900, Premium 19900)
   */
  @Patch('accounts/:id/plan')
  async changePlan(
    @Param('id') id: string,
    @Body() body: { plan: 'Découverte' | 'Accès' | 'Premium'; montant?: number },
  ) {
    return this.adminService.changePlan(id, body.plan, body.montant);
  }

  /**
   * Impersonation d'un client spécifique pour assistance technique
   * Génère un JWT temporaire valide 2h
   */
  @Post('impersonate/:userId')
  @HttpCode(HttpStatus.OK)
  async impersonate(@Param('userId') userId: string) {
    return this.adminService.impersonateUser(userId);
  }

  /**
   * Déclenchement d'une notification push globale via expo-server-sdk
   */
  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcastNotification(
    @Body() body: { title: string; body: string; target?: 'ALL' | 'ACTIVE' | 'PENDING' },
  ) {
    return this.adminService.broadcastNotification(body);
  }
}
