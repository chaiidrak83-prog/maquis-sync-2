import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Establishment } from '../auth/entities/establishment.entity';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
  ) {}

  /**
   * Calcule le quota maximal de gérants selon le forfait du maquis
   * Découverte = 2, Accès = 5, Premium = illimité (999)
   */
  private getMaxGerantsQuota(plan?: string): number {
    const p = (plan || '').toLowerCase();
    if (p.includes('accès') || p.includes('acces')) return 5;
    if (p.includes('premium')) return 999;
    return 2; // Découverte par défaut
  }

  // =========================================================================
  // GESTION DES GÉRANTS (RÉSERVÉ AU PROPRIÉTAIRE)
  // =========================================================================

  async getGerants(establishmentId: string) {
    const establishment = await this.establishmentRepo.findOne({
      where: { id: establishmentId },
    });
    if (!establishment) {
      throw new NotFoundException('Établissement introuvable.');
    }

    const gerants = await this.userRepo.find({
      where: {
        establishment_id: establishmentId,
        role: In(['GERANT', 'MANAGER']),
      },
      order: { created_at: 'DESC' },
    });

    const enAttente = gerants.filter((g) => g.statut_approbation === 'EN_ATTENTE');
    const actifs = gerants.filter((g) => g.statut_approbation === 'APPROUVE');
    const rejetes = gerants.filter((g) => g.statut_approbation === 'REJETE');

    const maxQuota = this.getMaxGerantsQuota(establishment.plan);
    const quotaActuel = actifs.length;
    const isQuotaFull = quotaActuel >= maxQuota;

    return {
      code_etablissement: establishment.code_etablissement || '',
      nom_maquis: establishment.name,
      plan: establishment.plan,
      quota_actuel: quotaActuel,
      quota_max: maxQuota,
      quota_plein: isQuotaFull,
      en_attente: enAttente.map((g) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        role: g.role,
        statut_approbation: g.statut_approbation,
        created_at: g.created_at,
      })),
      actifs: actifs.map((g) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        role: g.role,
        statut_approbation: g.statut_approbation,
        created_at: g.created_at,
      })),
      rejetes: rejetes.map((g) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        role: g.role,
        statut_approbation: g.statut_approbation,
        created_at: g.created_at,
      })),
    };
  }

  async approuverGerant(gerantId: string, establishmentId: string) {
    const establishment = await this.establishmentRepo.findOne({
      where: { id: establishmentId },
    });
    if (!establishment) {
      throw new NotFoundException('Établissement introuvable.');
    }

    const gerant = await this.userRepo.findOne({
      where: {
        id: gerantId,
        establishment_id: establishmentId,
        role: In(['GERANT', 'MANAGER']),
      },
    });
    if (!gerant) {
      throw new NotFoundException('Gérant introuvable pour cet établissement.');
    }

    // Vérification stricte des quotas d'abonnement
    const maxQuota = this.getMaxGerantsQuota(establishment.plan);
    const approvedCount = await this.userRepo.count({
      where: {
        establishment_id: establishmentId,
        role: In(['GERANT', 'MANAGER']),
        statut_approbation: 'APPROUVE',
      },
    });

    if (approvedCount >= maxQuota) {
      this.logger.warn(
        `Quota de gérants dépassé pour "${establishment.name}" (${approvedCount}/${maxQuota} - Forfait ${establishment.plan}).`,
      );
      throw new ForbiddenException('Quota de gérants atteint. Veuillez passer à l\'offre supérieure.');
    }

    gerant.statut_approbation = 'APPROUVE';
    gerant.status = 'VALIDATED';
    gerant.is_active = true;
    await this.userRepo.save(gerant);

    this.logger.log(`Gérant "${gerant.name}" validé pour "${establishment.name}" (${approvedCount + 1}/${maxQuota}).`);

    return {
      success: true,
      message: 'Gérant approuvé avec succès.',
      gerant: {
        id: gerant.id,
        name: gerant.name,
        phone: gerant.phone,
        role: gerant.role,
        statut_approbation: gerant.statut_approbation,
      },
      quota_actuel: approvedCount + 1,
      quota_max: maxQuota,
    };
  }

  async rejeterGerant(gerantId: string, establishmentId: string) {
    const gerant = await this.userRepo.findOne({
      where: {
        id: gerantId,
        establishment_id: establishmentId,
        role: In(['GERANT', 'MANAGER']),
      },
    });
    if (!gerant) {
      throw new NotFoundException('Gérant introuvable pour cet établissement.');
    }

    gerant.statut_approbation = 'REJETE';
    await this.userRepo.save(gerant);
    this.logger.log(`Demande de gérance rejetée pour "${gerant.name}" (${gerant.phone}).`);

    return {
      success: true,
      message: 'Demande de gérance rejetée.',
      gerant: {
        id: gerant.id,
        name: gerant.name,
        phone: gerant.phone,
        statut_approbation: 'REJETE',
      },
    };
  }

  // =========================================================================
  // GESTION DES SERVEUSES (GÉRANT OU PROPRIÉTAIRE)
  // =========================================================================

  async getServeuses(establishmentId: string) {
    const establishment = await this.establishmentRepo.findOne({
      where: { id: establishmentId },
    });
    if (!establishment) {
      throw new NotFoundException('Établissement introuvable.');
    }

    const serveuses = await this.userRepo.find({
      where: {
        establishment_id: establishmentId,
        role: In(['SERVEUSE', 'WAITRESS']),
      },
      order: { created_at: 'DESC' },
    });

    const enAttente = serveuses.filter((s) => s.statut_approbation === 'EN_ATTENTE');
    const actives = serveuses.filter((s) => s.statut_approbation === 'APPROUVE');
    const rejetees = serveuses.filter((s) => s.statut_approbation === 'REJETE');

    return {
      code_etablissement: establishment.code_etablissement || '',
      nom_maquis: establishment.name,
      total: serveuses.length,
      en_attente: enAttente.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role,
        statut_approbation: s.statut_approbation,
        created_at: s.created_at,
      })),
      actives: actives.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role,
        statut_approbation: s.statut_approbation,
        created_at: s.created_at,
      })),
      rejetees: rejetees.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role,
        statut_approbation: s.statut_approbation,
        created_at: s.created_at,
      })),
    };
  }

  async approuverServeuse(serveuseId: string, establishmentId: string) {
    const serveuse = await this.userRepo.findOne({
      where: {
        id: serveuseId,
        establishment_id: establishmentId,
        role: In(['SERVEUSE', 'WAITRESS']),
      },
    });
    if (!serveuse) {
      throw new NotFoundException('Serveuse introuvable pour cet établissement.');
    }

    serveuse.statut_approbation = 'APPROUVE';
    serveuse.status = 'VALIDATED';
    serveuse.is_active = true;
    await this.userRepo.save(serveuse);

    this.logger.log(`Serveuse "${serveuse.name}" approuvée avec succès.`);

    return {
      success: true,
      message: 'Serveuse approuvée avec succès. Accès au menu POS autorisé.',
      serveuse: {
        id: serveuse.id,
        name: serveuse.name,
        phone: serveuse.phone,
        role: serveuse.role,
        statut_approbation: 'APPROUVE',
      },
    };
  }

  async rejeterServeuse(serveuseId: string, establishmentId: string) {
    const serveuse = await this.userRepo.findOne({
      where: {
        id: serveuseId,
        establishment_id: establishmentId,
        role: In(['SERVEUSE', 'WAITRESS']),
      },
    });
    if (!serveuse) {
      throw new NotFoundException('Serveuse introuvable pour cet établissement.');
    }

    serveuse.statut_approbation = 'REJETE';
    await this.userRepo.save(serveuse);
    this.logger.log(`Demande d'inscription serveuse rejetée pour "${serveuse.name}".`);

    return {
      success: true,
      message: 'Demande de serveuse rejetée.',
      serveuse: {
        id: serveuse.id,
        name: serveuse.name,
        phone: serveuse.phone,
        statut_approbation: 'REJETE',
      },
    };
  }
}
