import { registerDecorator, type ValidationOptions } from 'class-validator'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

// Контактный номер в объявлении: строка с «+» и кодом страны, как её
// присылает клиентское поле ("+7 (999) 999-99-99", "+375 29 123-45-67").
// Проверяем только то, что номер возможен по длине и коду страны; доступные
// страны здесь не ограничиваем — это решает подтверждение номера при
// регистрации (PhoneConfirmationService), а не контакт в объявлении.
export function IsPhoneNumberString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumberString',
      target: object.constructor,
      propertyName,
      options: { message: 'Некорректный формат телефона', ...validationOptions },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !value.trim().startsWith('+')) return false

          return Boolean(parsePhoneNumberFromString(value)?.isPossible())
        }
      }
    })
  }
}
