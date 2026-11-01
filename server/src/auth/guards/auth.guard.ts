import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { UserService } from '@/user/user.service'
import { isSessionCurrent } from '@/session/session-version'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    const userId = request.session?.userId

    if (!userId) {
      throw new UnauthorizedException('Необходимо войти в аккаунт.')
    }

    const user = await this.userService.findById(userId)

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден')
    }

    // Обезличенный (удалённый) аккаунт не должен проходить дальше guard'а,
    // даже если в браузере как-то уцелела старая сессия — см.
    // UserService.deleteAccount/schema.prisma (User.deletedAt).
    if (user.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён')
    }

    // Пароль сменили или сбросили после этого входа: сессия больше не
    // действует. Удаляем её из хранилища, чтобы она не висела до истечения
    // срока; ответ 401 разлогинивает сайт и приложение.
    if (!isSessionCurrent(request.session, user)) {
      request.session.destroy(() => undefined)
      throw new UnauthorizedException('Сессия завершена: пароль был изменён. Войдите снова.')
    }

    request.user = user

    return true
  }
}

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  handleRequest(err, user, info, context: ExecutionContext) {
    return user || null
  }
}
