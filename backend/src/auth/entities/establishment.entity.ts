import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('establishments')
export class Establishment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'code_etablissement', length: 50, nullable: true })
  code_etablissement: string;

  @Column({ name: 'subscription_tier', length: 50, default: 'DECOUVERTE' })
  subscription_tier: string;

  @Column({ length: 50, default: 'Découverte' })
  plan: string;

  @Column({ type: 'int', default: 9900 })
  montant: number;

  @Column({ name: 'subscription_status', length: 50, default: 'trial' })
  subscription_status: string;

  @Column({ name: 'statut_paiement', length: 50, default: 'en_attente' })
  statut_paiement: string;

  @Column({
    name: 'ussd_template',
    length: 255,
    default: '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#',
  })
  ussd_template: string;

  @Column({ name: 'last_active_at', nullable: true })
  last_active_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
