import { Injectable } from '@nestjs/common';
import { IPaginatedSource } from 'src/common/pagination/types';

@Injectable()
export class PrismaAdapter<T> implements IPaginatedSource<T> {
  private model: any;

  // model передаём динамически через метод
  setModel(model: any) {
    this.model = model;
  }

  async find(options: any) {
    return this.model.findMany(options);
  }

  async count(options: any) {
    return this.model.count({ where: options.where });
  }
}
