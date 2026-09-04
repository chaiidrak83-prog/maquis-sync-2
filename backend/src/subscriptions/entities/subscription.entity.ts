import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlanType = 'Découverte' | 'Accès' | 'Premium';
export type StatutPaiementType = 'en_attente' | 'actif';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  user_id: string;

  @Column({ name: 'user_name', length: 255 })
  user_name: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'establishment_name', length: 255, default: 'Mon Maquis' })
  establishment_name: string;

  @Column({ length: 50 })
  plan: PlanType;

  @Column({ type: 'int' })
  montant: number; // 9900 | 14900 | 19900

  @Column({
    name: 'statut_paiement',
    length: 50,
    default: 'en_attente',
  })
  statut_paiement: StatutPaiementType; // 'en_attente' | 'actif'

  @Column({ name: 'expo_push_token', length: 255, nullable: true })
  expo_push_token: string;

  @Column({
    name: 'validated_at',
    nullable: true,
  })
  validated_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
