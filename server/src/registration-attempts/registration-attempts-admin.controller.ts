import { Controller, Get, Query, UseGuards } from '@nestjs/common'

import { UserRole } from '@/generated/prisma/enums'

import { Roles } from '@/auth/decorators/roles.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { FindRegistrationAttemptsQueryDto } from './dto/find-registration-attempts-query.dto'
import { RegistrationAttemptsService } from './registration-attempts.service'

// Журнал попыток регистрации для администратора: где люди застревают и не
// сломана ли регистрация.
@Controller('admin/registration-attempts')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
export class RegistrationAttemptsAdminController {
  constructor(private readonly registrationAttemptsService: RegistrationAttemptsService) {}

  @Get()
  find(@Query() query: FindRegistrationAttemptsQueryDto) {
    return this.registrationAttemptsService.findForAdmin(query)
  }
}
