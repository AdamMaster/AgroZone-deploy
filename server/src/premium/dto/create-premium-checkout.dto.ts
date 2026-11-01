import { AppReturnDto } from '@/libs/yookassa/dto/app-return.dto'

// Тело запроса на оплату премиума. Пустое с сайта; из приложения — адрес
// возврата (см. AppReturnDto).
export class CreatePremiumCheckoutDto extends AppReturnDto {}
