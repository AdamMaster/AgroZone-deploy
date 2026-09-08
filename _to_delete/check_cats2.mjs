import { CATEGORY_VALIDATION_ISSUES, CATEGORIES_DATA } from './prisma/data/categories.ts'
console.log('errors:', CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'error').length)
console.log('warnings:', CATEGORY_VALIDATION_ISSUES.filter(i => i.severity === 'warning').length)
const services = CATEGORIES_DATA.find(c => c.name === 'Услуги')
const transport = services.children.find(c => c.name === 'Грузоперевозки')
const slaughter = services.children.find(c => c.name === 'Услуги по убою и первичной переработке')
console.log('Грузоперевозки priceUnits:', transport.priceUnits)
console.log('Убой priceUnits:', slaughter.priceUnits)
