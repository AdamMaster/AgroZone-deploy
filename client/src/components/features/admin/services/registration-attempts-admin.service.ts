import { api } from '@/shared/api'

import {
  IRegistrationAttemptsPage,
  RegistrationAttemptChannel,
  RegistrationAttemptFilter,
  RegistrationAttemptPlatform
} from '../types/admin.types'

export interface FindRegistrationAttemptsParams {
  filter: RegistrationAttemptFilter
  channel?: RegistrationAttemptChannel
  platform?: RegistrationAttemptPlatform
  search?: string
  page?: number
  limit?: number
  [key: string]: string | number | undefined
}

class RegistrationAttemptsAdminService {
  private URL = 'admin/registration-attempts'

  async find(params: FindRegistrationAttemptsParams): Promise<IRegistrationAttemptsPage> {
    return api.get<IRegistrationAttemptsPage>(this.URL, { params })
  }
}

export const registrationAttemptsAdminService = new RegistrationAttemptsAdminService()
