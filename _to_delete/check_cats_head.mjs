import { CATEGORY_VALIDATION_ISSUES } from './prisma/data/categories_head.ts'
console.log('warnings:', CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'warning').length)
console.log(JSON.stringify(CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'warning')))
console.log('errors:', CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'error').length)
