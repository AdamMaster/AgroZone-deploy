import { api } from '@/shared/api'

import { AdReportStatus, IAdReportAdmin } from '../types/admin.types'

class AdReportsAdminService {
  private URL = 'ad-reports'

  async findAll(): Promise<IAdReportAdmin[]> {
    return api.get<IAdReportAdmin[]>(this.URL)
  }

  async updateStatus(id: string, status: AdReportStatus): Promise<IAdReportAdmin> {
    return api.patch<IAdReportAdmin>(`${this.URL}/${id}`, { status })
  }
}

export const adReportsAdminService = new AdReportsAdminService()
