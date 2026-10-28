import { IsEnum } from 'class-validator'

export enum SellerReviewModerationDecision {
  PUBLISH = 'PUBLISH',
  HIDE = 'HIDE'
}

export class ModerateSellerReviewDto {
  @IsEnum(SellerReviewModerationDecision)
  decision!: SellerReviewModerationDecision
}
