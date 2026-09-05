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

@Controller('serveuses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT', 'MANAGER', 'PROPRIETAIRE', 'OWNER', 'SUPER_ADMIN')
export class ServeusesController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * Liste les serveuses de l'établissement (Nouvelles serveuses en attente et Serveuses actives)
   */
  @Get()
  async getServeuses(@Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.getServeuses(establishmentId);
  }

  /**
   * Approbation d'une serveuse par le Gérant (ou Propriétaire)
   */
  @Patch(':id/approuver')
  async approuverServeuse(@Param('id') id: string, @Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.approuverServeuse(id, establishmentId);
  }

  /**
   * Rejet d'une serveuse par le Gérant (ou Propriétaire)
   */
  @Patch(':id/rejeter')
  async rejeterServeuse(@Param('id') id: string, @Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) {
      throw new ForbiddenException('Aucun établissement associé à cet utilisateur.');
    }
    return this.staffService.rejeterServeuse(id, establishmentId);
  }
}
