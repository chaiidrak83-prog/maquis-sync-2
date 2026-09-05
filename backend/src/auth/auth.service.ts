import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { User } from './entities/user.entity';
import { Establishment } from './entities/establishment.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { RegisterDto } from './dto/register.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  /**
   * Génère un code d'établissement unique court et mémorisable (ex: MQ-7492 ou MQ-A3B8)
   */
  async generateEstablishmentCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempts = 0; attempts < 50; attempts++) {
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const candidate = `MQ-${suffix}`;
      const existing = await this.establishmentRepo.findOne({ where: { code_etablissement: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    return `MQ-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Provisionne automatiquement le compte Super Administrateur si inexistant
   */
  async seedSuperAdmin() {
    const adminPhone = '00000000';
    const existing = await this.userRepo.findOne({ where: { phone: adminPhone } });
    if (!existing) {
      const passwordHash = await bcrypt.hash('SuperAdmin2026!', 10);
      const superAdmin = this.userRepo.create({
        name: 'Super Administrateur MaquisSaaS',
        phone: adminPhone,
        password_hash: passwordHash,
        pin_hash: '9999',
        role: 'SUPER_ADMIN',
        status: 'VALIDATED',
        statut_approbation: 'APPROUVE',
        statut_paiement: 'actif',
        is_active: true,
        last_active_at: new Date(),
      });
      await this.userRepo.save(superAdmin);
      this.logger.log(' Compte SUPER_ADMIN par défaut provisionné [Phone: 00000000]');
    }
  }

  /**
   * Connexion universelle (Super Admin, Propriétaire, Gérant)
   */
  async login(phone: string, password: string) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Identifiants incorrects (numéro ou mot de passe)');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants incorrects (numéro ou mot de passe)');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Ce compte a été suspendu par l’administration.');
    }

    // Hiérarchie de validation : Blocage si en attente d'approbation par le responsable
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'OWNER' && user.role !== 'PROPRIETAIRE') {
      if (user.statut_approbation === 'EN_ATTENTE') {
        throw new ForbiddenException('Votre compte est en attente de validation par votre responsable.');
      }
      if (user.statut_approbation === 'REJETE') {
        throw new ForbiddenException('Votre compte a été refusé par votre responsable.');
      }
    }

    // Mise à jour de la dernière activité
    user.last_active_at = new Date();
    await this.userRepo.save(user);

    let establishmentName = 'Administration Centrale';
    let codeEtablissement = '';
    let plan = user.plan || 'Découverte';
    if (user.establishment_id) {
      const est = await this.establishmentRepo.findOne({ where: { id: user.establishment_id } });
      if (est) {
        establishmentName = est.name;
        codeEtablissement = est.code_etablissement || '';
        plan = est.plan || plan;
        est.last_active_at = new Date();
        await this.establishmentRepo.save(est);
      }
    }

    const payload = {
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      statut_approbation: user.statut_approbation,
      statut_paiement: user.statut_paiement,
      establishment_id: user.establishment_id,
      establishment_name: establishmentName,
      code_etablissement: codeEtablissement,
      plan,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Connexion réussie',
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        statut_approbation: user.statut_approbation,
        statut_paiement: user.statut_paiement,
        establishment_id: user.establishment_id,
        establishment_name: establishmentName,
        code_etablissement: codeEtablissement,
        plan,
      },
    };
  }

  /**
   * Connexion spécifique et ultra-sécurisée Super Administrateur (/auth/admin-login)
   * Vérifie le rôle SUPER_ADMIN en base de données.
   * Si non-admin ou erreur : renvoie systématiquement HTTP 403 Forbidden sans préciser la cause.
   */
  async adminLogin(phone: string, password: string) {
    const user = await this.userRepo.findOne({ where: { phone } });

    // Règle de sécurité stricte : vérification du rôle SUPER_ADMIN
    if (!user || user.role !== 'SUPER_ADMIN' || !user.password_hash) {
      this.logger.warn(`Tentative d'accès non autorisé à /auth/admin-login avec le numéro : ${phone}`);
      throw new ForbiddenException('Accès refusé : privilèges insuffisants.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      this.logger.warn(`Échec de mot de passe Super Admin pour le numéro : ${phone}`);
      throw new ForbiddenException('Accès refusé : privilèges insuffisants.');
    }

    if (!user.is_active) {
      throw new ForbiddenException('Accès refusé : privilèges insuffisants.');
    }

    // Mise à jour de la dernière activité
    user.last_active_at = new Date();
    await this.userRepo.save(user);

    const payload = {
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: 'SUPER_ADMIN',
      statut_paiement: 'actif',
      establishment_name: 'Direction Générale MaquisSaaS',
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Connexion Super Admin autorisée',
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        statut_paiement: 'actif',
      },
    };
  }

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

    // 3. Génération d'un code établissement unique
    const codeEtablissement = await this.generateEstablishmentCode();

    // 4. Création de l'établissement avec statut_paiement = 'en_attente' et code_etablissement
    const establishment = this.establishmentRepo.create({
      name: dto.nom_maquis,
      code_etablissement: codeEtablissement,
      subscription_tier: dto.plan.toUpperCase(),
      plan: dto.plan,
      montant: dto.montant,
      subscription_status: 'trial',
      statut_paiement: 'en_attente',
      ussd_template: '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#',
    });
    const savedEst = await this.establishmentRepo.save(establishment);

    // 5. Création du compte utilisateur propriétaire (OWNER, approuvé par défaut)
    const user = this.userRepo.create({
      establishment_id: savedEst.id,
      name: dto.nom_maquis,
      phone: dto.phone,
      password_hash: passwordHash,
      pin_hash: '0000',
      role: 'OWNER',
      status: 'VALIDATED',
      statut_approbation: 'APPROUVE',
      statut_paiement: 'en_attente',
      plan: dto.plan,
      montant: dto.montant,
      push_token: dto.expoPushToken,
      expo_push_token: dto.expoPushToken,
    });
    const savedUser = await this.userRepo.save(user);

    // 6. Création de la souscription rattachée
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
      `Nouvel établissement inscrit : "${savedEst.name}" [Code: ${codeEtablissement}, Phone: ${savedUser.phone}, Plan: ${dto.plan}, Statut: en_attente]`,
    );

    // Notification automatique Super Admin (Nouveau compte)
    try {
      const superAdmins = await this.userRepo.find({ where: { role: 'SUPER_ADMIN' } });
      const adminPushTokens = superAdmins
        .map(admin => admin.expo_push_token || admin.push_token)
        .filter((token): token is string => Boolean(token && Expo.isExpoPushToken(token)));

      if (adminPushTokens.length > 0) {
        const notificationText = `Nouvelle inscription : Le maquis ${savedEst.name} attend la validation de son paiement.`;
        const messages: ExpoPushMessage[] = adminPushTokens.map(token => ({
          to: token,
          sound: 'default',
          title: 'Nouvelle inscription',
          body: notificationText,
          priority: 'high',
          data: {
            establishmentId: savedEst.id,
            nom_maquis: savedEst.name,
            plan: dto.plan,
            montant: dto.montant,
          },
        }));
        const chunks = this.expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          await this.expo.sendPushNotificationsAsync(chunk);
        }
        this.logger.log(`Push notification envoyée aux Super Admins pour le maquis "${savedEst.name}".`);
      }
    } catch (pushErr) {
      this.logger.warn(`Impossible d'envoyer la notification Super Admin: ${pushErr}`);
    }

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
        code_etablissement: savedEst.code_etablissement,
        statut_paiement: savedEst.statut_paiement,
        subscription_tier: savedEst.subscription_tier,
      },
      user: {
        id: savedUser.id,
        name: savedUser.name,
        phone: savedUser.phone,
        role: savedUser.role,
        statut_approbation: savedUser.statut_approbation,
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
   * Inscription d'un membre du personnel (Gérant ou Serveuse) avec code établissement
   */
  async registerStaff(dto: RegisterStaffDto, role: 'GERANT' | 'SERVEUSE') {
    const formattedCode = (dto.code_etablissement || '').trim().toUpperCase();
    if (!formattedCode) {
      throw new NotFoundException('Le code établissement est obligatoire.');
    }

    // 1. Recherche du maquis par code établissement
    const establishment = await this.establishmentRepo.findOne({
      where: { code_etablissement: formattedCode },
    });

    if (!establishment) {
      throw new NotFoundException(
        `Code établissement "${formattedCode}" introuvable. Veuillez vérifier auprès de votre responsable.`,
      );
    }

    // 2. Vérification unicité du numéro de téléphone
    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException(
        `Le numéro de téléphone ${dto.phone} est déjà utilisé par un autre compte.`,
      );
    }

    // 3. Hachage du mot de passe
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const pin = dto.phone.slice(-4).padStart(4, '0');

    // 4. Création avec statut_approbation = EN_ATTENTE
    const newUser = this.userRepo.create({
      establishment_id: establishment.id,
      name: dto.name,
      phone: dto.phone,
      password_hash: passwordHash,
      pin_hash: pin,
      role,
      status: 'PENDING',
      statut_approbation: 'EN_ATTENTE',
      statut_paiement: establishment.statut_paiement,
      plan: establishment.plan,
      montant: establishment.montant,
      is_active: true,
    });

    const savedUser = await this.userRepo.save(newUser);
    const roleLabel = role === 'GERANT' ? 'Gérant' : 'Serveuse';

    this.logger.log(
      `Nouvelle inscription ${roleLabel} : "${savedUser.name}" [Phone: ${savedUser.phone}, Établissement: "${establishment.name}", Code: ${formattedCode}, Statut: EN_ATTENTE]`,
    );

    return {
      success: true,
      message: `Inscription enregistrée. Votre compte est en attente de validation par votre responsable.`,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        phone: savedUser.phone,
        role: savedUser.role,
        statut_approbation: 'EN_ATTENTE',
        establishment_id: establishment.id,
        establishment_name: establishment.name,
        code_etablissement: establishment.code_etablissement,
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

    let codeEtablissement = '';
    let establishmentName = '';
    if (user.establishment_id) {
      const est = await this.establishmentRepo.findOne({ where: { id: user.establishment_id } });
      if (est) {
        codeEtablissement = est.code_etablissement || '';
        establishmentName = est.name;
      }
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
      statut_approbation: user.statut_approbation,
      statut_paiement: sub ? sub.statut_paiement : user.statut_paiement,
      establishment_id: user.establishment_id,
      establishment_name: establishmentName,
      code_etablissement: codeEtablissement,
      subscription: sub,
    };
  }
}
