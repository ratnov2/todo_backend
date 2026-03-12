import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { UploadAssetDto } from './dto/upload-asset.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('assets')
export class S3Controller {
  constructor(private readonly s3: S3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data') // 👈 КЛЮЧЕВО
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'lottie/achievements',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Загрузка ассета (lottie / gif / png)' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAssetDto,
  ) {
    const folder = dto.folder ?? 'misc';

    return this.s3.uploadFile(file, folder);
  }
}
