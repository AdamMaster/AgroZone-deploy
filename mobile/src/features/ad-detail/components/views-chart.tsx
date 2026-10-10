import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { formatShortIsoDate } from '@/shared/utils/date'

interface ViewsChartProps {
  days: readonly { date: string; views: number }[]
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
// Как у графика сайта: высота 180, цвет столбиков, скругление сверху.
const CHART_HEIGHT = 180
const BAR_COLOR = '#7db3ff'
const MAX_BAR_WIDTH = 50
const TICK_COUNT = 4

// «Красивый» верх оси: 7 → 8, 13 → 16, 0 → 4 — чтобы деления были целыми.
function niceAxisMax(maxValue: number): number {
  if (maxValue <= TICK_COUNT) return TICK_COUNT

  const step = Math.ceil(maxValue / TICK_COUNT)
  return step * TICK_COUNT
}

// Просмотры по дням недели столбиками — как график сайта (recharts). Нажатие
// на столбик показывает дату и число просмотров, как подсказка сайта.
export function ViewsChart({ days }: ViewsChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const axisMax = niceAxisMax(Math.max(0, ...days.map(day => day.views)))
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => (axisMax / TICK_COUNT) * (TICK_COUNT - index))
  const selected = selectedIndex === null ? null : days[selectedIndex]

  return (
    <View>
      <View className='h-6 justify-center'>
        {selected && (
          <Text className='text-sm text-gray-500'>
            {formatShortIsoDate(selected.date)}: <Text className='font-semibold text-gray-950'>{selected.views}</Text>
          </Text>
        )}
      </View>

      <View className='flex-row' style={{ height: CHART_HEIGHT }}>
        <View className='w-6 justify-between pr-1'>
          {ticks.map(tick => (
            <Text key={tick} className='text-right text-[11px] leading-none text-muted-foreground'>
              {tick}
            </Text>
          ))}
        </View>

        <View className='flex-1'>
          {/* Горизонтальные линии сетки на каждом делении. */}
          <View className='absolute inset-0 justify-between'>
            {ticks.map(tick => (
              <View key={tick} className='h-px bg-border' />
            ))}
          </View>

          <View className='flex-1 flex-row items-end'>
            {days.map((day, index) => (
              <Pressable
                key={day.date}
                accessibilityRole='button'
                accessibilityLabel={`${WEEKDAY_LABELS[index]}, ${formatShortIsoDate(day.date)}: ${day.views}`}
                onPress={() => setSelectedIndex(current => (current === index ? null : index))}
                className='h-full flex-1 items-center justify-end px-1.5'
              >
                <View
                  className={selectedIndex === index ? 'opacity-80' : ''}
                  style={{
                    width: '100%',
                    maxWidth: MAX_BAR_WIDTH,
                    height: (day.views / axisMax) * CHART_HEIGHT,
                    backgroundColor: BAR_COLOR,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View className='mt-2 flex-row pl-6'>
        {WEEKDAY_LABELS.map(label => (
          <Text key={label} className='flex-1 text-center text-xs text-muted-foreground'>
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}
