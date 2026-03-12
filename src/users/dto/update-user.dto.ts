import { User } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: User['name'];

  @IsOptional()
  @IsString()
  telegramChatId?: User['telegramChatId'];

  @IsOptional()
  @IsString()
  role?: User['role'];

  @IsOptional()
  @IsBoolean()
  telegramEnabled?: User['telegramEnabled'];
}
