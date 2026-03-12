import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationModule } from './notification/notification.module';
import { TelegramService } from './telegram/telegram.service';
import { TelegramModule } from './telegram/telegram.module';
import { GamificationModule } from './gamification/gamification.module';
import { LevelsModule } from './levels/levels.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [PrismaModule, UsersModule, ConfigModule.forRoot(), AuthModule, FriendsModule, TasksModule, NotificationModule, TelegramModule, GamificationModule, LevelsModule, S3Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
