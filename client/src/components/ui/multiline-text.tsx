import { cn } from '@/lib/utils'

interface MultilineTextProps {
  text: string
  className?: string
}

// Рендерит многострочный текст, который ввёл пользователь сам (описание
// объявления и т.п.), абзацами — вместо голого <p white-space: pre-wrap>.
// Раньше именно так и выводили ad.description: каждый перевод строки,
// который продавец вставил как разделитель абзацев, добавлял пустую
// "строку" высотой в line-height. Если человек жал Enter несколько раз
// подряд (пытаясь визуально отделить абзацы, как привык в Word/заметках),
// пробел между абзацами разрастался пропорционально числу пустых строк —
// вплоть до огромных пустых полос в описании объявления.
//
// Здесь любая последовательность из двух и более пустых строк (\n{2,})
// схлопывается в один разрыв абзаца, а сам визуальный отступ между
// абзацами задаётся управляемым CSS-отступом (см. paragraphClassName ниже),
// а не количеством нажатий Enter пользователем. Одиночный перевод строки
// внутри абзаца (адрес в несколько строк, список и т.п.) по-прежнему
// сохраняется — white-space: pre-line ломает строку по каждому \n, но не
// зависит от числа подряд идущих пустых строк, в отличие от pre-wrap.
export const MultilineText = ({ text, className }: MultilineTextProps) => {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={cn('mb-3 leading-6 whitespace-pre-line last:mb-0', className)}>
          {paragraph}
        </p>
      ))}
    </>
  )
}
