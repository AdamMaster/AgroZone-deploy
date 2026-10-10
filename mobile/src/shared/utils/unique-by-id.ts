// Элементы всех загруженных страниц без повторов. Пагинация на сервере — по
// смещению (page/limit): если между загрузкой страниц появился новый
// элемент, выдача сдвигается, и последний элемент прошлой страницы приходит
// ещё раз первым на следующей. В списке ключ — id, повтор ключа ломает
// переиспользование ячеек FlashList.
export function uniqueById<T extends { id: string }>(pages: readonly (readonly T[])[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      result.push(item)
    }
  }

  return result
}
