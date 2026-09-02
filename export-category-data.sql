\copy (SELECT id, description FROM "Category" WHERE description IS NOT NULL) TO '/tmp/category_descriptions.csv' WITH CSV
\copy category_terms TO '/tmp/category_terms.csv' WITH CSV
