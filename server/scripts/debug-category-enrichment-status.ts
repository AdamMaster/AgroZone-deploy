import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'

// Разовый диагностический скрипт: НЕ трогает данные, только печатает
// отчёт — у каких категорий пустой description и у каких вообще нет
// строк CategoryTerm. Понадобился 08.09.2026, когда
// categories:enrich-descriptions неожиданно сказал "нечего обогащать"
// сразу после того как раздел "Услуги" впервые засеяли — надо было
// увидеть правду по базе, а не гадать по логам других скриптов.
//
//   npx dotenv -e .env -- ts-node scripts/debug-category-enrichment-status.ts
//
// Через Nest DI не идём — как и остальные скрипты в scripts/.

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  const categories = await prisma.category.findMany({
    select: {
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      parent: { select: { name: true } },
      _count: { select: { terms: true } }
    },
    orderBy: [{ parent: { name: 'asc' } }, { name: 'asc' }]
  })

  console.log(`Всего категорий в базе: ${categories.length}`)

  const withoutDescription = categories.filter(c => !c.description)
  const withoutTerms = categories.filter(c => c._count.terms === 0)

  console.log(`\nБез description (${withoutDescription.length}):`)
  for (const c of withoutDescription) {
    console.log(`  - ${c.parent?.name ? c.parent.name + ' > ' : ''}${c.name}`)
  }

  console.log(`\nБез CategoryTerm (${withoutTerms.length}):`)
  for (const c of withoutTerms) {
    console.log(`  - ${c.parent?.name ? c.parent.name + ' > ' : ''}${c.name}`)
  }

  console.log('\nВсе категории раздела "Услуги" (родитель или сама категория содержит "Услуги"):')
  const uslugi = categories.filter(c => c.name === 'Услуги' || c.parent?.name === 'Услуги')
  for (const c of uslugi) {
    const descPreview = c.description
      ? `"${c.description.slice(0, 60)}${c.description.length > 60 ? '...' : ''}"`
      : 'NULL'
    console.log(
      `  - ${c.name}: description=${descPreview}, терминов=${c._count.terms}, создана=${c.createdAt.toISOString()}, обновлена=${c.updatedAt.toISOString()}`
    )
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
