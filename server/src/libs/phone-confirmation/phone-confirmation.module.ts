import { Module } from '@nestjs/common'
import { SmsRuService } from '@/libs/smsru/smsru.service'
import { ZvonokService } from '@/libs/zvonok/zvonok.service'
import { PhoneConfirmationService } from './phone-confirmation.service'

@Module({
  providers: [PhoneConfirmationService, SmsRuService, ZvonokService],
  exports: [PhoneConfirmationService]
})
export class PhoneConfirmationModule {}
