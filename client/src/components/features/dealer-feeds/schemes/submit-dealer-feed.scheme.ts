import { z } from 'zod'

export const SubmitDealerFeedSchema = z.object({
  url: z
    .string()
    .min(1, { message: 'Укажите ссылку на XML-фид' })
    .url({ message: 'Некорректная ссылка' })
    .refine(value => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'Ссылка должна начинаться с http:// или https://'
    })
})

export type TypeSubmitDealerFeedSchema = z.infer<typeof SubmitDealerFeedSchema>
