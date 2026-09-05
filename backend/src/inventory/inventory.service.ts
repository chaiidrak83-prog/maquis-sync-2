import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

// Bouteilles SVG haute visibilité pour le cache hors-ligne
const DEFAULT_BOTTLE_ICONS = {
  biere_ambre: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%231a1610"/><path d="M42 12 h16 v22 h-16 Z" fill="%23d97706"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23b45309"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%23f59e0b"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23d97706"/><circle cx="50" cy="100" r="12" fill="%23fef3c7"/><path d="M47 92 l6 8 l-6 8" stroke="%2378350f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  biere_verte: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%230f1c15"/><path d="M42 12 h16 v22 h-16 Z" fill="%23059669"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23047857"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%2310b981"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23047857"/><circle cx="50" cy="100" r="12" fill="%23d1fae5"/><path d="M44 100 h12 M50 94 v12" stroke="%23064e3b" stroke-width="3" stroke-linecap="round"/></svg>`,
  stout_noire: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%23121214"/><path d="M42 12 h16 v22 h-16 Z" fill="%23451a03"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%2327150a"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%231c1917"/><rect x="28" y="78" width="44" height="44" rx="6" fill="%23ca8a04"/><circle cx="50" cy="100" r="13" fill="%23000000"/><path d="M45 95 Q50 90 55 95 Q50 110 45 95" fill="%23eab308"/></svg>`,
  sucrerie_rouge: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%23241014"/><path d="M42 12 h16 v22 h-16 Z" fill="%23dc2626"/><rect x="40" y="34" width="20" height="24" rx="4" fill="%23991b1b"/><path d="M30 58 Q24 72 24 94 L24 136 Q24 146 36 146 L64 146 Q76 146 76 136 L76 94 Q76 72 70 58 Z" fill="%23ef4444"/><rect x="28" y="80" width="44" height="40" rx="6" fill="%23b91c1c"/><circle cx="50" cy="100" r="12" fill="%23fee2e2"/><path d="M44 104 Q50 94 56 104" stroke="%23991b1b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  eau_bleue: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" width="100%" height="100%"><rect width="100" height="160" rx="16" fill="%230c1e2e"/><path d="M42 10 h16 v22 h-16 Z" fill="%230284c7"/><rect x="40" y="32" width="20" height="24" rx="4" fill="%230369a1"/><path d="M30 56 Q24 70 24 92 L24 138 Q24 148 36 148 L64 148 Q76 148 76 138 L76 92 Q76 70 70 56 Z" fill="%230ea5e9"/><rect x="28" y="80" width="44" height="38" rx="6" fill="%23bae6fd"/><circle cx="50" cy="99" r="11" fill="%23ffffff"/><path d="M50 92 C46 98 46 104 50 106 C54 104 54 98 50 92 Z" fill="%230284c7"/></svg>`,
};

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultProducts();
  }

  /**
   * Provisionne automatiquement les boissons initiales si la table est vide
   */
  async seedDefaultProducts() {
    const count = await this.productRepo.count();
    if (count === 0) {
      this.logger.log('Initialisation du catalogue de boissons par défaut avec photos visuelles...');
      const defaultProducts = [
        {
          name: 'Brakina',
          volume: '65cl',
          price: 900,
          category: 'Bière',
          initial_stock: 120,
          current_stock: 120,
          imageUrl: DEFAULT_BOTTLE_ICONS.biere_ambre,
          is_active: true,
        },
        {
          name: 'Beaufort Lager',
          volume: '65cl',
          price: 1000,
          category: 'Bière',
          initial_stock: 80,
          current_stock: 80,
          imageUrl: DEFAULT_BOTTLE_ICONS.biere_verte,
          is_active: true,
        },
        {
          name: 'Guinness Foreign Extra',
          volume: '33cl',
          price: 1200,
          category: 'Bière',
          initial_stock: 45,
          current_stock: 45,
          imageUrl: DEFAULT_BOTTLE_ICONS.stout_noire,
          is_active: true,
        },
        {
          name: 'Coca-Cola',
          volume: '33cl',
          price: 700,
          category: 'Sucrerie',
          initial_stock: 60,
          current_stock: 60,
          imageUrl: DEFAULT_BOTTLE_ICONS.sucrerie_rouge,
          is_active: true,
        },
        {
          name: 'Eau Minérale Laafi',
          volume: '1.5L',
          price: 500,
          category: 'Eau',
          initial_stock: 40,
          current_stock: 40,
          imageUrl: DEFAULT_BOTTLE_ICONS.eau_bleue,
          is_active: true,
        },
      ];

      for (const prod of defaultProducts) {
        const item = this.productRepo.create(prod);
        await this.productRepo.save(item);
      }
      this.logger.log(`✓ ${defaultProducts.length} boissons créées avec images haute visibilité.`);
    }
  }

  /**
   * Récupère toutes les boissons actives (globales ou propres à l'établissement)
   */
  async findAll(establishmentId?: string): Promise<Product[]> {
    if (establishmentId) {
      return this.productRepo.find({
        where: [
          { is_active: true, establishment_id: establishmentId },
          { is_active: true, establishment_id: IsNull() },
        ],
        order: { category: 'ASC', name: 'ASC' },
      });
    }
    return this.productRepo.find({
      where: { is_active: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Ajoute une nouvelle boisson avec photo
   */
  async create(dto: CreateProductDto, establishmentId?: string): Promise<Product> {
    const product = this.productRepo.create({
      name: dto.name,
      volume: dto.volume || '65cl',
      price: dto.price,
      category: dto.category || 'Bière',
      initial_stock: dto.initial_stock || 50,
      current_stock: dto.current_stock !== undefined ? dto.current_stock : (dto.initial_stock || 50),
      imageUrl: dto.imageUrl || DEFAULT_BOTTLE_ICONS.biere_ambre,
      establishment_id: establishmentId,
      is_active: true,
    });

    const saved = await this.productRepo.save(product);
    this.logger.log(`Nouvelle boisson créée : ${saved.name} (${saved.category}) - ${saved.price} FCFA [ID: ${saved.id}]`);
    return saved;
  }

  /**
   * Met à jour une boisson existante (prix, stock, photo)
   */
  async update(id: string, dto: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Boisson [ID: ${id}] introuvable`);
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.volume !== undefined) product.volume = dto.volume;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.category !== undefined) product.category = dto.category;
    if (dto.current_stock !== undefined) product.current_stock = dto.current_stock;
    if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;

    return this.productRepo.save(product);
  }

  /**
   * Supprime (désactive) une boisson
   */
  async delete(id: string): Promise<boolean> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Boisson [ID: ${id}] introuvable`);
    }
    product.is_active = false;
    await this.productRepo.save(product);
    return true;
  }
}
