import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'establishment_id', nullable: true })
  establishment_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'password_hash', length: 255, nullable: true })
  password_hash: string;

  @Column({ name: 'pin_hash', length: 255, default: '0000' })
  pin_hash: string;

  @Column({ length: 50, default: 'OWNER' })
  role: string;

  @Column({ length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'statut_approbation', length: 50, default: 'EN_ATTENTE' })
  statut_approbation: string; // 'EN_ATTENTE' | 'APPROUVE' | 'REJETE'

  @Column({ name: 'statut_paiement', length: 50, default: 'en_attente' })
  statut_paiement: string;

  @Column({ length: 50, default: 'Découverte' })
  plan: string;

  @Column({ type: 'int', default: 9900 })
  montant: number;

  @Column({ name: 'push_token', length: 255, nullable: true })
  push_token: string;

  @Column({ name: 'expo_push_token', length: 255, nullable: true })
  expo_push_token: string;

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @Column({ name: 'last_active_at', nullable: true })
  last_active_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
