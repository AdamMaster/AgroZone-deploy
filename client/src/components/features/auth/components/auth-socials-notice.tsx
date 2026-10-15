import Link from 'next/link'

// Согласие на обработку персональных данных при входе через Яндекс (152-ФЗ):
// у OAuth нет отдельного шага с чекбоксом, поэтому согласие даётся
// продолжением через Яндекс, о чём и предупреждает этот текст (см.
// AuthService.extractProfileFromCode на сервере). Показывается везде, где
// есть кнопка Яндекса.
export const AuthSocialsNotice = () => (
  <p className='text-muted-foreground mt-3 text-xs'>
    Продолжая через Яндекс, вы принимаете{' '}
    <Link href='/terms' target='_blank' className='text-primary underline'>
      Пользовательское соглашение
    </Link>{' '}
    и даёте согласие на обработку персональных данных согласно{' '}
    <Link href='/privacy' target='_blank' className='text-primary underline'>
      Политике конфиденциальности
    </Link>
    .
  </p>
)
