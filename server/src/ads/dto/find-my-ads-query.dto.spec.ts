import 'reflect-metadata'

import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { FindMyAdsQueryDto } from './find-my-ads-query.dto'

const parse = async (query: Record<string, unknown>) => {
  const dto = plainToInstance(FindMyAdsQueryDto, query)
  return { dto, errors: await validate(dto) }
}

describe('FindMyAdsQueryDto', () => {
  it('принимает один статус', async () => {
    const { dto, errors } = await parse({ status: 'DRAFT' })

    expect(errors).toHaveLength(0)
    expect(dto.status).toEqual(['DRAFT'])
  })

  it('принимает повтор параметра и список через запятую', async () => {
    expect((await parse({ status: ['PUBLISHED', 'PENDING'] })).dto.status).toEqual(['PUBLISHED', 'PENDING'])
    expect((await parse({ status: 'PUBLISHED,PENDING' })).dto.status).toEqual(['PUBLISHED', 'PENDING'])
  })

  it('отклоняет неизвестный статус', async () => {
    const { errors } = await parse({ status: 'PUBLISHED,DELETED' })

    expect(errors).not.toHaveLength(0)
  })
})
