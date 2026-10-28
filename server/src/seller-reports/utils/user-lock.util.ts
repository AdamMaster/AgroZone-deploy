import { Prisma } from '@/generated/prisma/client'

// Блокировка строки пользователя FOR UPDATE. Подсчёт жалоб на продавца и
// решение модератора по ним должны идти по очереди: иначе жалоба, пришедшая
// во время решения, могла бы остаться без внимания или приостановка
// сработала бы дважды.
export async function lockUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`
}
