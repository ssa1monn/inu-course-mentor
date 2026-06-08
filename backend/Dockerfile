FROM node:20-alpine

# Prisma가 Alpine(musl)에서 동작하려면 openssl 필요
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4000

# 시작 시: 스키마를 DB에 반영(db push) → 졸업요건 데모 시드 → 서버 기동
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node prisma/seed.js && node src/index.js"]
