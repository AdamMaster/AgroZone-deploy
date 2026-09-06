import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_PATH_PREFIX = '/admin'
const PROFILE_PATH_PREFIX = '/profile'

function getServerUrl() {
  const serverUrl = process.env.SERVER_URL
  if (!serverUrl) return null
  return serverUrl.replace(/\/+$/, '')
}

// 1. Делаем функцию асинхронной
export default async function middleware(request: NextRequest) {
  const { url, cookies, nextUrl } = request

  const session = cookies.get('session')?.value
  const isProfilePage = nextUrl.pathname.startsWith(PROFILE_PATH_PREFIX)
  const isAdminPage = nextUrl.pathname === ADMIN_PATH_PREFIX || nextUrl.pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)

  if (isProfilePage && !session) {
    // U1 в ROADMAP.md: раньше редирект просто увозил гостя на главную,
    // теряя, куда он вообще шёл (например, /profile/settings/messages?ad=…
    // при клике «Написать» из письма/шаринга — прямая ссылка на защищённую
    // страницу, а не клик по кнопке на сайте, где это уже перехватывается
    // на клиенте, см. header-actions.tsx/mobile-tab-bar.tsx/ad-detail.tsx).
    // Кладём исходный путь в returnUrl — HeaderActions на главной прочитает
    // его и откроет модалку входа уже с этим returnTo, чтобы после входа
    // унести пользователя туда, куда он и шёл.
    const returnUrl = `${nextUrl.pathname}${nextUrl.search}`
    const redirectUrl = new URL('/', url)
    redirectUrl.searchParams.set('auth', 'true')
    redirectUrl.searchParams.set('returnUrl', returnUrl)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && nextUrl.pathname === '/profile') {
    return NextResponse.redirect(new URL('/profile/settings', url))
  }

  if (isAdminPage) {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return NextResponse.redirect(new URL('/', url))
    }

    const cookieHeader = request.headers.get('cookie') ?? ''

    // 2. Переписываем fetch на async/await с обработкой ошибок через try/catch
    try {
      const res = await fetch(`${serverUrl}/users/profile`, {
        method: 'GET',
        headers: {
          cookie: cookieHeader
        },
        cache: 'no-store'
      })

      if (!res.ok) {
        return NextResponse.redirect(new URL('/?auth=true', url))
      }

      const profile = (await res.json()) as { role?: string } | null
      const role = profile?.role

      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/profile/settings', url))
      }

      return NextResponse.next()
    } catch (error) {
      return NextResponse.redirect(new URL('/?auth=true', url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/profile/:path*', '/admin/:path*']
}
