import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Establishment } from './entities/establishment.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Enregistre un nouvel établissement avec compte propriétaire et abonnement en statut 'en_attente'
   */
  async register(dto: RegisterDto) {
    // 1. Vérifier si un compte avec ce numéro de téléphone existe déjà
    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException(
        `Le numéro de téléphone ${dto.phone} est déjà utilisé par un autre compte.`,
      );
    }

    // 2. Hachage du mot de passe avec bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. Création de l'établissement avec statut_paiement = 'en_attente'
    const establishment = this.establishmentRepo.create({
      name: dto.nom_maquis,
      subscription_tier: dto.plan.toUpperCase(),
      subscription_status: 'trial',
      statut_paiement: 'en_attente',
      ussd_template: '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#',
    });
    const savedEst = await this.establishmentRepo.save(establishment);

    // 4. Création du compte utilisateur propriétaire (OWNER)
    const user = this.userRepo.create({
      establishment_id: savedEst.id,
      name: dto.nom_maquis,
      phone: dto.phone,
      password_hash: passwordHash,
      pin_hash: '0000',
      role: 'OWNER',
      status: 'PENDING',
      statut_paiement: 'en_attente',
      expo_push_token: dto.expoPushToken,
    });
    const savedUser = await this.userRepo.save(user);

    // 5. Création de la souscription rattachée
    const subscription = this.subscriptionRepo.create({
      user_id: savedUser.id,
      user_name: dto.nom_maquis,
      phone: dto.phone,
      establishment_name: dto.nom_maquis,
      plan: dto.plan,
      montant: dto.montant,
      statut_paiement: 'en_attente',
      expo_push_token: dto.expoPushToken,
    });
    const savedSub = await this.subscriptionRepo.save(subscription);

    this.logger.log(
      `Nouvel établissement inscrit : "${savedEst.name}" [Phone: ${savedUser.phone}, Plan: ${dto.plan}, Statut: en_attente]`,
    );

    // 6. Génération du JWT avec le statut_paiement restreint
    const payload = {
      sub: savedUser.id,
      establishment_id: savedEst.id,
      nom_maquis: savedEst.name,
      phone: savedUser.phone,
      role: savedUser.role,
      statut_paiement: 'en_attente',
      plan: dto.plan,
      subscription_id: savedSub.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Inscription réussie. Votre compte est en attente de paiement.',
      access_token: accessToken,
      establishment: {
        id: savedEst.id,
        name: savedEst.name,
        statut_paiement: savedEst.statut_paiement,
        subscription_tier: savedEst.subscription_tier,
      },
      user: {
        id: savedUser.id,
        name: savedUser.name,
        phone: savedUser.phone,
        role: savedUser.role,
        statut_paiement: savedUser.statut_paiement,
      },
      subscription: {
        id: savedSub.id,
        plan: savedSub.plan,
        montant: savedSub.montant,
        statut_paiement: savedSub.statut_paiement,
      },
    };
  }

  /**
   * Profil et statut de l'utilisateur connecté
   */
  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const sub = await this.subscriptionRepo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      statut_paiement: sub ? sub.statut_paiement : user.statut_paiement,
      subscription: sub,
    };
  }
}
