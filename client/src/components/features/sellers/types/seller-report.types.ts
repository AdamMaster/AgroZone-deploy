// Значения — строго как в enum SellerReportReason на бэкенде
// (prisma/schema.prisma).
export enum SellerReportReason {
  PrepaymentScam = 'PREPAYMENT_SCAM',
  FakeAd = 'FAKE_AD',
  StolenPhotos = 'STOLEN_PHOTOS',
  DifferentItem = 'DIFFERENT_ITEM',
  Other = 'OTHER'
}

// Тело POST /users/:id/reports.
export interface ICreateSellerReportDto {
  reason: SellerReportReason
  comment?: string
}
