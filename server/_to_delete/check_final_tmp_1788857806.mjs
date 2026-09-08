import { CATEGORY_VALIDATION_ISSUES, CATEGORIES_DATA } from './prisma/data/categories.ts';
console.log('issues:', CATEGORY_VALIDATION_ISSUES.length);
for (const i of CATEGORY_VALIDATION_ISSUES) console.log(JSON.stringify(i));
console.log('total categories:', CATEGORIES_DATA.length);
