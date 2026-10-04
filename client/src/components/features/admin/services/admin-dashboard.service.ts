import { api } from '@/shared/api'

import { DashboardPeriodDays, IAdminDashboard } from '../types/admin-dashboard.types'

class AdminDashboardService {
  private URL = 'admin/dashboard'

  async get(days: DashboardPeriodDays): Promise<IAdminDashboard> {
    return api.get<IAdminDashboard>(this.URL, { params: { days } })
  }
}

export const adminDashboardService = new AdminDashboardService()
