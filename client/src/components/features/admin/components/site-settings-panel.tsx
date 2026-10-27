'use client'

import { Skeleton, Switch } from '@/components/ui'

import { formatDateTime } from '@/shared/utils'

import { SITE_FLAG_LABELS } from '../constants/site-flag-labels'
import { useAdminSiteSettings, useUpdateSiteFlag } from '../hooks'
import { IAdminSiteFlag, IAdminSiteFlagChange, ISiteSettingActor } from '../types/admin.types'

const SECTION_TITLE_CLASS = 'mb-3 text-lg font-semibold'

const getActorName = (actor: ISiteSettingActor | null) =>
  actor ? (actor.displayName ?? 'Администратор') : 'Удалённый аккаунт'

const getFlagStatus = ({ updatedAt, updatedBy }: IAdminSiteFlag) =>
  updatedAt
    ? `Изменено ${formatDateTime(updatedAt)}, ${getActorName(updatedBy)}`
    : 'Не менялось — значение по умолчанию'

const getChangeText = ({ key, value, changedBy }: IAdminSiteFlagChange) =>
  `${getActorName(changedBy)} ${value ? 'включил(а)' : 'выключил(а)'} «${SITE_FLAG_LABELS[key].title}»`

// Страница «Настройки» админки: переключатели возможностей сайта и
// приложения. Изменение сразу записывается на сервере, а сайт и приложение
// подхватывают его в течение минуты (кеш ответа /site-settings/public) —
// ни деплоя, ни пересборки не нужно.
export const SiteSettingsPanel = () => {
  const { settings, isLoading, isError } = useAdminSiteSettings()
  const { updateSiteFlag, isUpdating } = useUpdateSiteFlag()

  return (
    <div className='py-6 text-mist-50'>
      <h1 className='mb-1 text-xl font-semibold'>Настройки</h1>
      <p className='mb-6 text-sm text-mist-300'>
        Переключатели возможностей сайта и приложения. Изменение применяется в течение минуты, без обновления
        приложения.
      </p>

      {isLoading && <Skeleton className='h-24 w-full max-w-3xl bg-mist-600/50' />}

      {isError && <p className='text-sm text-red-400'>Не удалось загрузить настройки. Обновите страницу.</p>}

      {settings && (
        <>
          <section className='max-w-3xl'>
            <h2 className={SECTION_TITLE_CLASS}>Возможности</h2>
            <ul className='flex flex-col gap-2'>
              {settings.flags.map(flag => {
                const { title, description } = SITE_FLAG_LABELS[flag.key]
                const switchId = `site-flag-${flag.key}`

                return (
                  <li key={flag.key} className='flex items-start gap-4 rounded-md bg-mist-600/50 p-4'>
                    <div className='min-w-0 flex-1'>
                      <label htmlFor={switchId} className='font-medium'>
                        {title}
                      </label>
                      <p className='mt-1 text-sm text-mist-300'>{description}</p>
                      <p className='mt-3 text-xs text-mist-400'>{getFlagStatus(flag)}</p>
                    </div>

                    <div className='flex shrink-0 items-center gap-2'>
                      <span className='text-sm text-mist-300'>{flag.value ? 'Включено' : 'Выключено'}</span>
                      <Switch
                        id={switchId}
                        checked={flag.value}
                        disabled={isUpdating}
                        onCheckedChange={value => updateSiteFlag({ key: flag.key, value })}
                        className='data-unchecked:bg-mist-400'
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className='mt-10 max-w-3xl'>
            <h2 className={SECTION_TITLE_CLASS}>История изменений</h2>
            {settings.changes.length === 0 ? (
              <p className='text-sm text-mist-300'>Переключателей пока никто не менял.</p>
            ) : (
              <ul className='flex flex-col gap-1.5'>
                {settings.changes.map(change => (
                  <li key={change.id} className='rounded-md bg-mist-700/30 px-3 py-2 text-sm'>
                    <span>{getChangeText(change)}</span>
                    <span className='ml-2 text-xs text-mist-400'>{formatDateTime(change.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
