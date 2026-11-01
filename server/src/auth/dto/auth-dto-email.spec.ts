import { BadRequestException, ValidationPipe } from '@nestjs/common'

import { ChangeEmailDto } from '../email-change/dto/email-change.dto'
import { CheckUserDto } from './check-user.dto'
import { LoginDto } from './login.dto'
import { RegisterDto } from './register.dto'

// Тот же ValidationPipe, что в main.ts.
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })
const validate = <T>(metatype: new () => T, body: object): Promise<T> =>
  pipe.transform(body, { type: 'body', metatype }) as Promise<T>

const registerBody = {
  name: 'Иван',
  email: '  Ivan@Example.COM ',
  password: 'secret1',
  passwordRepeat: 'secret1',
  personalDataConsent: true
}

describe('почта в запросах приводится к одному виду', () => {
  it('регистрация: почта без пробелов и в нижнем регистре', async () => {
    const dto = await validate(RegisterDto, registerBody)

    expect(dto.email).toBe('ivan@example.com')
  })

  it('регистрация не принимает телефон: регистрация по телефону — отдельный путь через звонок', async () => {
    await expect(validate(RegisterDto, { ...registerBody, phone: '+79991234567' })).rejects.toBeInstanceOf(
      BadRequestException
    )
  })

  it('регистрация без почты — 400', async () => {
    const { email: _email, ...withoutEmail } = registerBody

    await expect(validate(RegisterDto, withoutEmail)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('вход: почта нормализуется, телефон остаётся как есть', async () => {
    await expect(validate(LoginDto, { login: ' Ivan@Example.com', password: 'secret1' })).resolves.toMatchObject({
      login: 'ivan@example.com'
    })
    await expect(validate(LoginDto, { login: '+7 (999) 123-45-67', password: 'secret1' })).resolves.toMatchObject({
      login: '+7 (999) 123-45-67'
    })
  })

  it('проверка «есть ли пользователь» и смена почты тоже нормализуют почту', async () => {
    await expect(validate(CheckUserDto, { identifier: 'Ivan@Example.com' })).resolves.toMatchObject({
      identifier: 'ivan@example.com'
    })
    await expect(validate(ChangeEmailDto, { newEmail: 'New@Example.com', password: 'secret1' })).resolves.toMatchObject(
      {
        newEmail: 'new@example.com'
      }
    )
  })
})
