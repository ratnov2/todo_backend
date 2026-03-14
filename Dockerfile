# Используем официальный Node 20
FROM node:20

# Рабочая директория в контейнере
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Копируем весь проект
COPY . .

# CMD: запускаем wait-for-postgres.sh через sh (не нужно chmod на Windows)
# Скрипт ждёт пока Postgres готов, затем выполняются миграции и старт сервера
# CMD ["sh", "-c", "sh ./wait-for-postgres.sh todo_postgres npm run migrate && npm run start"]
CMD ["sh", "-c", "npm run prizma && npm run build && npm run start:prod"]

