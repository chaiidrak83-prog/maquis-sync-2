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
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowPendingPayment } from './guards/allow-pending.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Connexion universelle (Super Admin, Propriétaire, Gérant)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.password);
  }

  /**
   * Connexion spécifique et confidentielle Super Administrateur (/auth/admin-login)
   * Rejette systématiquement avec HTTP 403 Forbidden toute tentative non-admin
   */
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.phone, dto.password);
  }

  /**
   * Endpoint d'inscription (Onboarding Propriétaire)
   * Reçoit nom_maquis, phone, password, plan, montant et pushToken
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Auto-inscription Gérant via Code Établissement (Public)
   */
  @Post('register/gerant')
  @HttpCode(HttpStatus.CREATED)
  async registerGerant(@Body() dto: RegisterStaffDto) {
    return this.authService.registerStaff(dto, 'GERANT');
  }

  /**
   * Auto-inscription Serveuse via Code Établissement (Public)
   */
  @Post('register/serveuse')
  @HttpCode(HttpStatus.CREATED)
  async registerServeuse(@Body() dto: RegisterStaffDto) {
    return this.authService.registerStaff(dto, 'SERVEUSE');
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
