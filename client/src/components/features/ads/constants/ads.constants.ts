export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

// Параметры сжатия фото перед загрузкой (см. compressImage). 2048 px по
// большей стороне хватает и для карточки, и для увеличения в просмотрщике;
// файлы до 500 КБ, которым уменьшение не нужно, не перекодируются.
export const IMAGE_COMPRESSION = {
  maxDimension: 2048,
  quality: 0.85,
  skipBelowBytes: 500 * 1024
}
