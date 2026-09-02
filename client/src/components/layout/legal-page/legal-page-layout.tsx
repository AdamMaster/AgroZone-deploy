import { PropsWithChildren } from 'react'

import { Heading } from '@/components/ui'

import { Container } from '../container'

interface LegalPageLayoutProps {
  title: string
  effectiveDate: string
}

export const LegalPageLayout = ({ title, effectiveDate, children }: PropsWithChildren<LegalPageLayoutProps>) => {
  return (
    <Container className='max-w-4xl py-10 md:py-14'>
      <Heading level={1}>{title}</Heading>
      <p className='mt-2 text-sm text-gray-500'>Дата вступления в силу: {effectiveDate}</p>

      <div className='mt-8 space-y-8'>{children}</div>
    </Container>
  )
}
