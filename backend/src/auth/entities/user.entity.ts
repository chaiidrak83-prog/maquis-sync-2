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

  @Column({ name: 'statut_paiement', length: 50, default: 'en_attente' })
  statut_paiement: string;

  @Column({ name: 'expo_push_token', length: 255, nullable: true })
  expo_push_token: string;

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
