import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { UserModule } from '@/user/user.module'

import { AdminDashboardController } from './admin-dashboard.controller'
import { AdminDashboardService } from './admin-dashboard.service'

// UserModule и AuthModule нужны гвардам (AuthGuard/RolesGuard), как и в
// AdReportsModule; PrismaService приходит из глобального PrismaModule.
@Module({
  imports: [UserModule, AuthModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService]
})
export class AdminDashboardModule {}
