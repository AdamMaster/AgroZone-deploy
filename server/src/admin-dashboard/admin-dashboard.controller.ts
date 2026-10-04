import { Controller, Get, Query } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/enums'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { AdminDashboardService } from './admin-dashboard.service'
import { AdminDashboardQueryDto } from './dto/admin-dashboard-query.dto'

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  // Стартовая страница админки (/admin) — см. AdminDashboardService.
  @Authorization(UserRole.ADMIN)
  @Get()
  getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminDashboardService.getDashboard(query.days)
  }
}
