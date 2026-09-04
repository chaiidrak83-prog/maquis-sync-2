import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatusGuard } from '../auth/guards/payment-status.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PaymentStatusGuard)
export class InventoryController {
  @Get()
  getProducts() {
    return {
      message: 'Catalogue accessible : Votre abonnement est actif.',
      products: [
        { name: 'Brakina 65cl', price: 900, stock: 120 },
        { name: 'Sobebra 65cl', price: 1000, stock: 80 },
        { name: 'Guinness 33cl', price: 1200, stock: 15 },
        { name: 'Laafi 1.5L', price: 500, stock: 4 },
      ],
    };
  }
}
