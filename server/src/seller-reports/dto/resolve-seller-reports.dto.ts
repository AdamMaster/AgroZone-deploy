import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

import { SELLER_REPORT_RESOLUTION_NOTE_MAX_LENGTH } from '../constants/seller-reports.constants'

// Ступени решения по жалобам на продавца. Блокировки аккаунта среди них нет:
// её выносит только администратор отдельной процедурой.
export enum SellerReportResolutionAction {
  // Жалобы необоснованны: закрыть, вернуть приостановленные объявления.
  DISMISS = 'DISMISS',
  // Жалобы обоснованны: предупредить продавца, вернуть объявления.
  WARN = 'WARN',
  // Жалобы обоснованны: объявления остаются (или становятся) приостановленными.
  SUSPEND_ADS = 'SUSPEND_ADS'
}

export class ResolveSellerReportsDto {
  @IsEnum(SellerReportResolutionAction)
  action!: SellerReportResolutionAction

  // Внутренняя заметка модератора; продавцу не показывается.
  @IsOptional()
  @IsString()
  @MaxLength(SELLER_REPORT_RESOLUTION_NOTE_MAX_LENGTH)
  note?: string
}
