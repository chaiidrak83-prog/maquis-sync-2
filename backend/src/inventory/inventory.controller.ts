import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatusGuard } from '../auth/guards/payment-status.guard';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PaymentStatusGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getProducts(@Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    const prods = await this.inventoryService.findAll(establishmentId);

    return {
      message: 'Catalogue accessible : Votre abonnement est actif.',
      products: prods.map(p => ({
        id: p.id,
        name: p.name,
        volume: p.volume,
        price: p.price,
        stock: p.current_stock,
        current_stock: p.current_stock,
        category: p.category,
        imageUrl: p.imageUrl,
        is_active: p.is_active,
      })),
    };
  }

  @Post()
  async createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    const establishmentId = req.user?.establishment_id;
    const created = await this.inventoryService.create(dto, establishmentId);
    return {
      success: true,
      message: 'Boisson ajoutée avec succès au catalogue',
      product: created,
    };
  }

  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    const updated = await this.inventoryService.update(id, dto);
    return {
      success: true,
      message: 'Boisson mise à jour avec succès',
      product: updated,
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.inventoryService.delete(id);
    return {
      success: true,
      message: 'Boisson retirée du catalogue',
    };
  }
}
