// Презентация компании в профиле продавца (см. обсуждение с пользователем:
// аналог "Размещение файлов в товарах" у agroserver.ru). Сознательно НЕ
// повторяем их подход "разрешить что угодно вплоть до .exe" — это канал
// распространения произвольных исполняемых файлов с домена площадки
// (репутационный и юридический риск при абьюзе). Белый список — только
// статичные документы, которые реально нужны для сценария "прайс + о
// компании": PDF и современный Office (docx/xlsx/pptx).
//
// Старые бинарные форматы (.doc/.xls/.ppt) сюда намеренно не добавлены:
// они используют общий CFBF-контейнер, и определение реального типа файла
// по magic-number (см. UserController.updatePresentation, FileTypeValidator
// без skipMagicNumbersValidation) не может надёжно отличить один от
// другого на этом уровне — только "это какой-то CFBF-файл". Показывать
// пользователю ложное "файл не тот" для настоящего .doc — хуже, чем
// попросить пересохранить в .docx, тем более что macro-содержащие
// форматы (.docm/.xlsm/.pptm) так и так не должны проходить.
export const PRESENTATION_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
] as const

// Регулярка для FileTypeValidator — сверяется с типом, определённым по
// магическим числам содержимого файла (пакет file-type), а не с
// mimetype/расширением, которые прислал клиент и которые легко подделать.
export const PRESENTATION_FILE_TYPE_PATTERN = new RegExp(
  `^(${PRESENTATION_ALLOWED_MIME_TYPES.map(type => type.replace(/[.]/g, '\\.')).join('|')})$`
)

// То же самое человеку — используется в тексте ошибки и на фронте.
export const PRESENTATION_ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx']

// 15 МБ — с запасом под презентацию с картинками/прайс в Excel, но
// заметно меньше, чем есть смысл гонять через профиль продавца (AD_MAX_FILE_SIZE
// у объявлений — 10 МБ per-файл на фото, но их до 15 штук; тут документ один).
export const PRESENTATION_MAX_FILE_SIZE = 15 * 1024 * 1024
