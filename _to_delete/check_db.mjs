import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from './src/generated/prisma/client'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const total = await prisma.category.count()
  const withDescription = await prisma.category.count({ where: { NOT: { description: null } } })
  const servicesParent = await prisma.category.findUnique({ where: { id: 'cat_0gl7jms' }, include: { children: true } })
  const termsCount = await prisma.categoryTerm.count()
  const servicesTermsCount = servicesParent
    ? await prisma.categoryTerm.count({ where: { categoryId: { in: servicesParent.children.map(c => c.id) } } })
    : null

  console.log(JSON.stringify({
    total,
    withDescription,
    servicesFound: !!servicesParent,
    servicesChildrenCount: servicesParent?.children?.length,
    totalCategoryTerms: termsCount,
    servicesChildrenTermsCount: servicesTermsCount
  }, null, 2))
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) }).finally(() => prisma.$disconnect())
