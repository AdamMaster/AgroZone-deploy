import { PropsWithChildren, ReactNode } from 'react'

interface LegalSectionProps {
  number: string
  title: string
  lead?: ReactNode
}

// Одна пронумерованная секция юридического документа: "1. Общие
// положения", "2. Какие данные мы обрабатываем" и т.п. — параграфы и
// списки внутри секции пишутся уже как обычный JSX детьми.
export const LegalSection = ({ number, title, lead, children }: PropsWithChildren<LegalSectionProps>) => {
  return (
    <section>
      <h2 className='text-xl font-bold text-gray-800'>
        {number}. {title}
      </h2>
      {lead && <p className='mt-3 leading-relaxed text-gray-600'>{lead}</p>}
      <div className='mt-3 space-y-3 leading-relaxed text-gray-600 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5'>
        {children}
      </div>
    </section>
  )
}
