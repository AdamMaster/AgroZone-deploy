import { BadRequestException } from '@nestjs/common'
import { AdStatus } from '@/generated/prisma/enums'

import { AdStateMachineService } from './ad-state-machine.service'

describe('AdStateMachineService — приостановка по жалобам', () => {
  const machine = new AdStateMachineService()

  it('опубликованное объявление приостанавливается', () => {
    expect(machine.transition(AdStatus.PUBLISHED, 'SUSPEND')).toBe(AdStatus.SUSPENDED)
  })

  it('из приостановки выход один — возврат к публикации', () => {
    expect(machine.transition(AdStatus.SUSPENDED, 'RESTORE')).toBe(AdStatus.PUBLISHED)
  })

  it.each(['ARCHIVE', 'ACTIVATE', 'DRAFT', 'PUBLISH', 'REJECT'] as const)(
    'владелец не может сделать из приостановки «%s»',
    action => {
      expect(machine.canTransition(AdStatus.SUSPENDED, action)).toBe(false)
      expect(() => machine.transition(AdStatus.SUSPENDED, action)).toThrow(BadRequestException)
    }
  )

  it.each([AdStatus.DRAFT, AdStatus.PENDING, AdStatus.REJECTED, AdStatus.ARCHIVED, AdStatus.EXPIRED])(
    'приостановить можно только опубликованное, а не %s',
    status => {
      expect(machine.canTransition(status, 'SUSPEND')).toBe(false)
    }
  )
})
