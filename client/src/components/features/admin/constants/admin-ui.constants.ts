// Единый стиль кнопок во всей админке — светлая кнопка на тёмном фоне.
// Обычные варианты Button (components/ui/button.tsx) рассчитаны на светлую
// тему основного сайта, а здесь, на тёмных экранах /admin/*, нужен
// контраст в другую сторону. Раньше эта строка была скопирована по
// отдельности в moderation-queue.tsx, dealer-feeds-queue.tsx,
// reports-queue.tsx, create-user-form.tsx, users-search.tsx и
// user-admin-detail.tsx — один источник правды здесь.
export const ADMIN_BUTTON_CLASS = 'rounded-sm bg-neutral-600  hover:bg-neutral-500 px-3'
