import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { GerantsController } from './gerants.controller';
import { ServeusesController } from './serveuses.controller';
import { User } from '../auth/entities/user.entity';
import { Establishment } from '../auth/entities/establishment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Establishment])],
  controllers: [GerantsController, ServeusesController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
