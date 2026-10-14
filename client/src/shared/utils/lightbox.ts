// Общие настройки просмотрщика фото (yet-another-react-lightbox): страница
// объявления и чат открывают фото одинаково.

// На компьютере листание фото в лайбоксе мгновенное (без анимации), на телефоне
// - обычный плавный свайп пальцем. Анимацию отключали одной настройкой
// animation.swipe = 0 для всех, из-за чего на телефоне слайд дёргался за
// пальцем и после отпускания прыгал на место рывком. Различаем по основному
// указателю: pointer: coarse - палец (телефон/планшет), иначе мышь.
export const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// На телефоне в лайбоксе оставляем только крестик: стрелки не нужны (листаем
// свайпом), кнопки масштаба тоже (увеличение щипком работает и без них).
export const MOBILE_LIGHTBOX_RENDER = { buttonPrev: () => null, buttonNext: () => null, buttonZoom: () => null }
export const MOBILE_LIGHTBOX_TOOLBAR = { buttons: ['close' as const] }
// На телефоне фото во всю ширину экрана: убираем внутренние отступы слайда
export const MOBILE_LIGHTBOX_CAROUSEL = { padding: 0 }
