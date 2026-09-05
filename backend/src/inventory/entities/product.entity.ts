import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'establishment_id', nullable: true })
  establishment_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, default: '65cl' })
  volume: string;

  @Column({ type: 'int', default: 1000 })
  price: number;

  @Column({ length: 50, default: 'Bière' })
  category: string; // 'Bière' | 'Sucrerie' | 'Eau'

  @Column({ type: 'int', default: 50, name: 'initial_stock' })
  initial_stock: number;

  @Column({ type: 'int', default: 50, name: 'current_stock' })
  current_stock: number;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl: string; // URL web ou chaîne Base64 / SVG pour le cache hors-ligne

  @Column({ name: 'is_active', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
