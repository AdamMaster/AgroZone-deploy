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
    return NextResponse.redirect(new URL('/?auth=true', url))
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
