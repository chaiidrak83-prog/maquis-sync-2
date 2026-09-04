import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatusGuard } from '../auth/guards/payment-status.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard, PaymentStatusGuard)
export class OrdersController {
  @Get()
  getOrders() {
    return {
      message: 'Module caisse accessible : Votre abonnement est actif.',
      orders: [],
    };
  }

  @Post()
  createOrder() {
    return {
      message: 'Commande enregistrée.',
    };
  }
}
