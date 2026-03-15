# ---------- BUILDER ----------
FROM node:20-alpine AS builder

# Рабочая директория
WORKDIR /app

# Копируем только package.json и lockfile для кеширования слоёв
COPY package.json yarn.lock ./

# Устанавливаем dev зависимости
RUN yarn install --frozen-lockfile

# 2️⃣ prisma schema (для генерации клиента)
COPY prisma ./prisma

# переменная нужна только чтобы prisma generate не падал
ARG DATABASE_URL_LOCAL="postgresql://localhost:5432/stub"
ENV DATABASE_URL_LOCAL=$DATABASE_URL_LOCAL

# 3️⃣ генерируем Prisma Client
RUN npx prisma generate

# Копируем проект
COPY . .

# Билдим NestJS проект
RUN yarn build


# ---------- PRODUCTION ----------
FROM node:20-alpine AS prod

WORKDIR /app

# Копируем package.json и lockfile
COPY package.json yarn.lock ./
 
# Устанавливаем только production зависимости
RUN yarn install --production --frozen-lockfile
 
COPY --from=builder /app/dist ./dist

# prisma schema
COPY prisma ./prisma

# prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
    
# Экспортируем порт приложения
EXPOSE 3000
    
# Используем ENV из .env на runtime
CMD ["sh", "-c", "node dist/main.js"]