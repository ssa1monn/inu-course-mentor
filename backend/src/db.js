import { PrismaClient } from "@prisma/client";

// Prisma 클라이언트 단일 인스턴스
export const prisma = new PrismaClient();
