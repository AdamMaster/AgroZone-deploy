import { Injectable } from '@nestjs/common'
import { SellerReviewFilterFlag } from '@/generated/prisma/enums'

import { PrismaService } from '@/prisma/prisma.service'

import {
  SELLER_REVIEW_REPEATED_TEXT_MIN_LENGTH,
  SELLER_REVIEW_REPEATED_TEXT_THRESHOLD
} from './constants/seller-reviews.constants'
import { detectTextFlags } from './utils/review-text-filter.util'

// Все проверки текста отзыва: правила по самому тексту (мат, ссылки,
// телефоны) плюс повтор того же текста в других отзывах, для которого нужна
// база.
@Injectable()
export class SellerReviewTextFilterService {
  constructor(private readonly prisma: PrismaService) {}

  // reviewId — правимый отзыв: сам с собой он не сравнивается.
  async detect(
    text: string | null | undefined,
    authorId: string,
    reviewId?: string
  ): Promise<SellerReviewFilterFlag[]> {
    const flags = detectTextFlags(text)

    if (text && (await this.isRepeated(text, authorId, reviewId))) {
      flags.push(SellerReviewFilterFlag.REPEATED_TEXT)
    }

    return flags
  }

  // Текст повторяется, если такой уже есть у других отзывов в количестве
  // порога, либо этот же автор уже писал его в другом отзыве (копипаста на
  // нескольких продавцов).
  private async isRepeated(text: string, authorId: string, reviewId?: string): Promise<boolean> {
    if (text.length < SELLER_REVIEW_REPEATED_TEXT_MIN_LENGTH) {
      return false
    }

    const same = await this.prisma.sellerReview.findMany({
      where: {
        text: { equals: text, mode: 'insensitive' },
        ...(reviewId && { id: { not: reviewId } })
      },
      select: { authorId: true },
      take: SELLER_REVIEW_REPEATED_TEXT_THRESHOLD
    })

    return same.length >= SELLER_REVIEW_REPEATED_TEXT_THRESHOLD || same.some(row => row.authorId === authorId)
  }
}
