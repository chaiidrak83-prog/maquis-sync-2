import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('gerants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROPRIETAIRE', 'OWNER', 'SUPER_ADMIN')
export class GerantsController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Liste les gérants de l'établissement (Demandes en attente et Gérants actifs)
   */
  @Get()
  async getGerants(@Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.getGerants(establishmentId);
  }

  /**
   * Approbation d'un gérant par le Propriétaire (sous réserve de quota d'abonnement)
   */
  @Patch(':id/approuver')
  async approuverGerant(@Param('id') id: string, @Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.approuverGerant(id, establishmentId);
  }

  /**
   * Rejet d'un gérant par le Propriétaire
   */
  @Patch(':id/rejeter')
  async rejeterGerant(@Param('id') id: string, @Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.rejeterGerant(id, establishmentId);
  }
}
