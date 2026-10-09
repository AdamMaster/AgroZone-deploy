import { IsString, Length, Matches } from 'class-validator'

export class MobileOAuthExchangeDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Код входа указан некорректно.' })
  ticket!: string

  // RFC 7636: 43–128 символов из набора [A-Za-z0-9-._~].
  @IsString()
  @Length(43, 128, { message: 'Некорректный параметр codeVerifier.' })
  @Matches(/^[A-Za-z0-9\-._~]+$/, { message: 'Некорректный параметр codeVerifier.' })
  codeVerifier!: string
}
