import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { type ReactElement, useCallback, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { AppRefreshControl } from '@/shared/components/app-refresh-control'
import { Button } from '@/shared/components/button'
import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'
import { Skeleton } from '@/shared/components/skeleton'

import { useCreateSellerReview } from '../hooks/use-seller-review-actions'
import { useMySellerReview, useSellerReviews } from '../hooks/use-seller-reviews'
import type {
  SellerRating,
  SellerReview,
  SellerReviewBlockReason,
  SellerReviewEligibility
} from '../types/seller-review.types'
import { MySellerReview } from './my-seller-review'
import { RatingStars } from './rating-stars'
import { ReviewReplyButton, ReviewReportButton } from './review-actions'
import { ReviewCard } from './review-card'
import { ReviewFormDialog } from './review-form-dialog'
import { formatReviewsCount } from './seller-rating'

const SCREEN_PADDING = 16

// Причины, по которым пользователю стоит объяснить, почему отзыв пока нельзя
// оставить. Остальные (сам себе, блокировка, уже оставил) молчим: либо это не
// о чем сообщать, либо отзыв уже показан выше.
const EXPLAINED_REASONS: readonly SellerReviewBlockReason[] = [
  'NO_CONTACT',
  'CONTACT_TOO_FRESH',
  'ACCOUNT_TOO_YOUNG',
  'DAILY_LIMIT'
]

const keyExtractor = (review: SellerReview) => review.id

interface SellerReviewsListProps {
  sellerId: string
  // Всё, что над отзывами (карточка продавца, вкладки) — прокручивается
  // вместе со списком.
  header: ReactElement
}

// Вкладка «Отзывы» на странице продавца — как SellerReviews сайта: итог
// рейтинга, свой отзыв или кнопка «Оставить отзыв», список отзывов с
// подгрузкой при прокрутке. Рисуется только при включённых рейтингах.
export function SellerReviewsList({ sellerId, header }: SellerReviewsListProps) {
  const { bottom } = useSafeAreaInsets()
  const isSignedIn = useIsSignedIn()
  const { data: profile } = useProfile()
  const status = useAuthStore(state => state.status)

  const isOwner = profile?.id === sellerId
  const list = useSellerReviews(sellerId)
  const mine = useMySellerReview(sellerId, isSignedIn && !isOwner)

  const myReview = mine.data?.review ?? null
  // Свой отзыв показываем отдельным блоком, из общего списка его убираем.
  const otherReviews = myReview ? list.reviews.filter(review => review.id !== myReview.id) : list.reviews

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch } = list

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const refresh = useCallback(() => Promise.all([refetch(), mine.refetch()]), [refetch, mine])

  const renderReview: ListRenderItem<SellerReview> = ({ item }) => (
    <View className='pb-3'>
      <ReviewCard review={item}>
        {isOwner && <ReviewReplyButton review={item} sellerId={sellerId} />}
        {item.author.id !== profile?.id && <ReviewReportButton reviewId={item.id} isSignedIn={isSignedIn} />}
      </ReviewCard>
    </View>
  )

  const listHeader = (
    <View className='gap-6 pb-4'>
      {header}
      <RatingSummary rating={list.rating} />
      {!isOwner && (
        <ReviewAccess
          sellerId={sellerId}
          isSignedIn={isSignedIn}
          isLoading={status === 'restoring' || (isSignedIn && (!profile || mine.isPending))}
          hasReview={!!myReview}
          eligibility={mine.data?.eligibility}
        />
      )}
      {myReview && <MySellerReview review={myReview} sellerId={sellerId} />}
    </View>
  )

  const listEmpty = list.isPending ? (
    <View className='gap-3'>
      <Skeleton className='h-28 rounded-xl' />
      <Skeleton className='h-28 rounded-xl' />
    </View>
  ) : list.isError ? (
    <ScreenMessage
      title='Не удалось загрузить отзывы'
      description={list.error?.message}
      action={{ title: 'Повторить', onPress: () => void refetch() }}
    />
  ) : myReview ? null : (
    <Text className='py-6 text-center text-[15px] text-gray-500'>Отзывов пока нет.</Text>
  )

  const footer = isFetchingNextPage ? (
    <View className='py-6'>
      <ActivityIndicator colorClassName='accent-gray-500' />
    </View>
  ) : isFetchNextPageError ? (
    <View className='items-center gap-3 py-6'>
      <Text className='text-center text-sm text-gray-500'>{list.error?.message}</Text>
      <Button title='Загрузить ещё' onPress={() => void fetchNextPage()} />
    </View>
  ) : null

  return (
    <FlashList
      data={otherReviews}
      renderItem={renderReview}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: SCREEN_PADDING + bottom }}
      onEndReached={loadMore}
      onEndReachedThreshold={1.5}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={footer}
      keyboardShouldPersistTaps='handled'
      refreshControl={<AppRefreshControl onRefresh={refresh} />}
    />
  )
}

// Итог: крупное среднее со звёздами и числом отзывов либо «Пока нет оценок».
function RatingSummary({ rating }: { rating?: SellerRating }) {
  if (rating?.average == null) {
    return (
      <View>
        <Heading level={4}>Пока нет оценок</Heading>
        <Text className='text-sm text-gray-500'>Рейтинг появится после первого отзыва.</Text>
      </View>
    )
  }

  return (
    <View className='flex-row items-center gap-5'>
      <Text className='text-4xl font-semibold text-gray-950'>{rating.average.toFixed(1).replace('.', ',')}</Text>
      <View className='gap-1'>
        <RatingStars value={rating.average} size={20} />
        <Text className='text-sm text-gray-500'>{formatReviewsCount(rating.count)}</Text>
      </View>
    </View>
  )
}

interface ReviewAccessProps {
  sellerId: string
  isSignedIn: boolean
  isLoading: boolean
  hasReview: boolean
  eligibility?: SellerReviewEligibility
}

// Что показать вместо формы: приглашение войти, кнопку «Оставить отзыв» или
// объяснение, почему отзыв пока нельзя оставить. Допуск считает сервер, мы его
// только показываем.
function ReviewAccess({ sellerId, isSignedIn, isLoading, hasReview, eligibility }: ReviewAccessProps) {
  const requestSignIn = useRequestSignIn()
  const create = useCreateSellerReview(sellerId)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Пока неизвестно, вошёл ли пользователь (или идёт проверка допуска),
  // показываем заглушку, а не приглашение войти: вошедший его не должен видеть.
  if (isLoading) return <Skeleton className='h-14 rounded-xl' />

  if (!isSignedIn) {
    return (
      <View className='gap-3 rounded-xl bg-gray-50 p-4'>
        <Text className='text-sm text-gray-600'>Отзыв может оставить покупатель, который связывался с продавцом.</Text>
        <Button title='Войти, чтобы оставить отзыв' variant='outline' onPress={() => requestSignIn()} />
      </View>
    )
  }

  if (hasReview || !eligibility) return null

  if (eligibility.canReview) {
    return (
      <>
        <Button title='Оставить отзыв' onPress={() => setIsFormOpen(true)} />
        <ReviewFormDialog
          visible={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title='Ваш отзыв о продавце'
          submitLabel='Отправить отзыв'
          isPending={create.isPending}
          onSubmit={({ rating, text }) =>
            create.mutate({ rating, text: text || undefined }, { onSuccess: () => setIsFormOpen(false) })
          }
        />
      </>
    )
  }

  if (!EXPLAINED_REASONS.includes(eligibility.reason)) return null

  return <Text className='rounded-xl bg-gray-50 p-4 text-sm text-gray-600'>{eligibility.message}</Text>
}
