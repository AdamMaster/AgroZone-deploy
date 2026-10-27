import { IsBoolean } from 'class-validator'

export class SetDealConfirmationDto {
  // true — отметить сделку состоявшейся, false — снять отметку.
  @IsBoolean()
  confirmed!: boolean
}
