// src/common/pagination/pagination.module.ts
import { Module } from '@nestjs/common';
import { PaginationService } from './pagination.service';
import { PrismaAdapter } from 'src/prisma/prisma.adapter';

@Module({
  providers: [PrismaAdapter, PaginationService],
  exports: [PrismaAdapter, PaginationService],
})
export class PaginationModule {}
