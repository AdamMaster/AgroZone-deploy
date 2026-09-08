import { CATEGORY_VALIDATION_ISSUES, CATEGORIES_DATA } from './prisma/data/categories.ts'

console.log('Total top-level categories:', CATEGORIES_DATA.length)
const services = CATEGORIES_DATA.find(c => c.name === 'Услуги')
console.log('Услуги found:', !!services, 'children:', services?.children?.length)
console.log('Validation issues (errors only):')
const errors = CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'error')
console.log(errors.length, 'errors')
for (const e of errors.slice(0, 30)) console.log(JSON.stringify(e))
console.log('Validation warnings:', CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'warning').length)
console.log(JSON.stringify(CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'warning')))
