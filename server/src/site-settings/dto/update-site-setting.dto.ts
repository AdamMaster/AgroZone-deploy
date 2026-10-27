import { IsBoolean } from 'class-validator'

export class UpdateSiteSettingDto {
  @IsBoolean()
  value!: boolean
}
