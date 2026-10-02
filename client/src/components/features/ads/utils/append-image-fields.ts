type AdImage = File | string

// Общая логика для всех мест, где форма объявления отправляет фотографии
// на бэкенд (создание/сохранение черновика, редактирование опубликованного
// объявления) — раньше была продублирована по отдельности в ad-create.tsx
// и ad-edit.tsx, и в этом месте содержала баг: если после правок среди
// values.images не осталось ни одной СТРОКИ (все старые фото заменены
// новыми файлами, но хотя бы одно фото в итоге есть), поле existingImages
// не отправлялось вовсе — appendImages проходился только по строкам, а
// отдельный fallback в onSubmit ставил existingImages='' лишь при ПОЛНОМ
// отсутствии фото (values.images.length === 0), не при замене единственного
// старого фото новым.
//
// Бэкенд (AdsService.update/saveDraft) не может отличить "existingImages не
// отправили, потому что фото вообще не трогали" от "отправили бы, но
// нечего было — все старые заменены" — он трактует отсутствие поля как
// "оставить всё как было" (см. ads.service.ts: `if (updateAdDto.existingImages)`
// и `existingImages ?? ad.images`). В итоге старое фото никогда не
// удалялось, а новое просто добавлялось вторым — именно так, как описал
// пользователь (визуально похоже на замену, по факту — добавление).
//
// Поэтому теперь existingImages отправляется ЯВНО всегда: либо список
// оставшихся строк, либо пустая строка '' как сигнал "ни одной старой не
// оставляем" — именно то значение, которое уже понимает бэкенд (пустая
// строка превращается в [] через @Transform в UpdateAdDto/CreateAdDto, а
// [] — truthy в JS, так что `if (updateAdDto.existingImages)` отрабатывает
// как положено и чистит все старые фото).
//
// newFileFieldName — имя multipart-поля для НОВЫХ файлов: 'images' для
// PATCH /ads/:id (AdsService.update), 'files' для POST/PATCH черновика
// (AdsService.saveDraft) — разные поля ждёт контроллер, см.
// AdsController.update/saveDraft.
export const appendImageFields = (formData: FormData, images: AdImage[], newFileFieldName: 'images' | 'files') => {
  const existingUrls = images.filter((img): img is string => typeof img === 'string')
  const newFiles = images.filter((img): img is File => img instanceof File)

  if (existingUrls.length === 0) {
    formData.append('existingImages', '')
  } else {
    existingUrls.forEach(url => formData.append('existingImages', url))
  }

  newFiles.forEach(file => formData.append(newFileFieldName, file))
}
