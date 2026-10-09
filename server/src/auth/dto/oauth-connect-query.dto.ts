import { IsOptional, IsString, MaxLength } from 'class-validator'

// GET /auth/oauth/connect/:provider. Без параметров — вход на сайте (state в
// cookie-сессии). С redirectUri и codeChallenge — вход из мобильного
// приложения (см. MobileOAuthService); тогда обязательны оба.
export class OAuthConnectQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  redirectUri?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  codeChallenge?: string
}
