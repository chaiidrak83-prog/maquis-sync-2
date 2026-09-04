import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { Establishment } from './auth/entities/establishment.entity';
import { InventoryController } from './inventory/inventory.controller';
import { OrdersController } from './orders/orders.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        const dbPassword = config.get<string>('DB_PASSWORD');

        if (dbUrl || (dbPassword && dbPassword.trim().length > 0)) {
          return {
            type: 'postgres',
            url: dbUrl,
            host: config.get<string>('DB_HOST', 'db.jutjgtwpzvveouoyyvft.supabase.co'),
            port: Number(config.get<number>('DB_PORT', 5432)),
            username: config.get<string>('DB_USER', 'postgres'),
            password: dbPassword,
            database: config.get<string>('DB_NAME', 'postgres'),
            entities: [Subscription, User, Establishment],
            synchronize: false,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          type: 'sqljs',
          location: './subscriptions.sqlite',
          autoSave: true,
          entities: [Subscription, User, Establishment],
          synchronize: true,
          logging: false,
        };
      },
    }),
    SubscriptionsModule,
    AuthModule,
  ],
  controllers: [InventoryController, OrdersController],
})
export class AppModule {}
