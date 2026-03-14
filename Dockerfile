# ---------- BUILDER ----------
FROM node:20-alpine AS builder

# Рабочая директория
WORKDIR /app

# Копируем только package.json и lockfile для кеширования слоёв
COPY package.json yarn.lock ./

# Устанавливаем dev зависимости
RUN yarn install --frozen-lockfile

# Копируем проект
COPY . .

# -----------------------------
# Prisma Client: генерируем без настоящего DATABASE_URL
# Можно использовать stub, чтобы build проходил
# -----------------------------
ARG DATABASE_URL_LOCAL="postgresql://localhost:5432/stub"
ENV DATABASE_URL_LOCAL=$DATABASE_URL_LOCAL
RUN npx prisma generate

# Билдим NestJS проект
RUN yarn build


# ---------- PRODUCTION ----------
FROM node:20-alpine AS prod

WORKDIR /app

# Копируем package.json и lockfile
COPY package.json yarn.lock ./
 
# Устанавливаем только production зависимости
RUN yarn install --production --frozen-lockfile
 
# Копируем билд и Prisma client из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
    
# Экспортируем порт приложения
EXPOSE 3000
    
# Используем ENV из .env на runtime
CMD ["node", "dist/main.js"]