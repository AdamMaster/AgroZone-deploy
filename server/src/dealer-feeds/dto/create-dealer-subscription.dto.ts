import { IsEnum } from 'class-validator'

import { DealerTier } from '@/generated/prisma/client'

export class CreateDealerSubscriptionDto {
  @IsEnum(DealerTier)
  tier!: DealerTier
}
