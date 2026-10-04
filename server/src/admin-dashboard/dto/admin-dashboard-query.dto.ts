import { Type } from 'class-transformer'
import { IsIn, IsOptional } from 'class-validator'

import { DASHBOARD_ALLOWED_PERIOD_DAYS, DASHBOARD_DEFAULT_PERIOD_DAYS } from '../constants/admin-dashboard.constants'

export class AdminDashboardQueryDto {
  // Только фиксированные периоды: произвольное число дней ничего не даёт
  // для обзора, а запрос по большой таблице не должен зависеть от клиента.
  @IsOptional()
  @Type(() => Number)
  @IsIn(DASHBOARD_ALLOWED_PERIOD_DAYS)
  days: number = DASHBOARD_DEFAULT_PERIOD_DAYS
}
