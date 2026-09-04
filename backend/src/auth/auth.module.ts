import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { Establishment } from './entities/establishment.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PaymentStatusGuard } from './guards/payment-status.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Establishment, Subscription]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'jwt-secret-maquis-saas-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PaymentStatusGuard],
  exports: [AuthService, JwtAuthGuard, PaymentStatusGuard, JwtModule],
})
export class AuthModule {}
