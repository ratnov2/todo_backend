import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadAssetDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'assets' })
  folder?: string; // например: lottie/achievements
}
