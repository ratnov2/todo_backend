import { Injectable, NotFoundException } from '@nestjs/common';

import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  PaginatedResource,
  Pagination,
} from 'src/decorator/pagination.decorator';
import { userSelect } from './select/user.select';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private db: PrismaService) {}
  async findAll({
    limit,
    offset,
    page,
    size,
  }: Pagination): Promise<PaginatedResource<Partial<User>>> {
    const [data, total] = await Promise.all([
      this.db.user.findMany({
        skip: offset,
        take: limit,
        select: userSelect.public,
      }),
      this.db.user.count(),
    ]);

    return {
      items: data,
      page,
      size,
      totalItems: total,
    };
  }

  findOne(id: number) {
    return this.db.user.findFirst({
      where: { id },
      select: userSelect.private,
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    return this.db.user.update({
      where: { id },
      data: updateUserDto,
      select: userSelect.public,
    });
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    return this.db.user.delete({
      where: { id },
    });
  }

  findByEmail(email: string) {
    return this.db.user.findFirst({
      where: { email },
    });
  }
}
