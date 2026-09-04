import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowPendingPayment } from './guards/allow-pending.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint d'inscription (Onboarding)
   * Reçoit nom_maquis, phone, password, plan, montant et pushToken
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Endpoint de vérification de profil/statut accessible même en statut 'en_attente'
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AllowPendingPayment()
  async getProfile(@Request() req) {
    return this.authService.getMe(req.user.sub);
  }
}
