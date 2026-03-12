import { Prisma } from '@prisma/client';

export const userSelect = {
  public: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
  } satisfies Prisma.UserSelect,

  private: {
    id: true,
    email: true,
    name: true,
    role: true,
    telegramChatId:true,
    telegramEnabled: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect,

  auth: {
    id: true,
    email: true,
    role: true,
    password: true,
  } satisfies Prisma.UserSelect,
};
