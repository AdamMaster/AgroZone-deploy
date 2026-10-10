import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { ScrollView, View, useWindowDimensions } from 'react-native'

interface FormScrollContextValue {
  // Поле раскрыло список подсказок: форма прокручивается так, чтобы поле
  // оказалось у верхнего края и список под ним не закрывала клавиатура.
  // Пока список открыт, внизу формы есть запас места — иначе поле у конца
  // формы не прокрутить наверх.
  expand: (key: string, target: View | null) => void
  collapse: (key: string) => void
}

const FormScrollContext = createContext<FormScrollContextValue | null>(null)

const FIELD_TOP_OFFSET = 16

// Прокручиваемая форма с полями-подсказками (категория, город, адрес):
// касание по варианту в списке не закрывает клавиатуру раньше, чем выбор
// сработал, а раскрытое поле поднимается к верху экрана.
export function FormScrollView({ children, contentClassName }: PropsWithChildren<{ contentClassName?: string }>) {
  const scrollRef = useRef<ScrollView>(null)
  const contentRef = useRef<View>(null)
  const pendingTargetRef = useRef<View | null>(null)
  const { height } = useWindowDimensions()
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() => new Set())

  const expand = useCallback((key: string, target: View | null) => {
    pendingTargetRef.current = target
    setExpandedKeys(current => new Set(current).add(key))
  }, [])

  const collapse = useCallback((key: string) => {
    setExpandedKeys(current => {
      if (!current.has(key)) return current

      const next = new Set(current)
      next.delete(key)
      return next
    })
  }, [])

  // Прокручиваем после того, как отрисован запас места внизу: раньше
  // прокрутка упёрлась бы в конец короткой формы.
  useEffect(() => {
    const target = pendingTargetRef.current
    const content = contentRef.current
    pendingTargetRef.current = null
    if (!target || !content) return

    target.measureLayout(content, (_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - FIELD_TOP_OFFSET), animated: true })
    })
  }, [expandedKeys])

  const contextValue = useMemo(() => ({ expand, collapse }), [expand, collapse])

  return (
    <FormScrollContext.Provider value={contextValue}>
      <ScrollView
        ref={scrollRef}
        className='flex-1'
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        <View ref={contentRef} className={contentClassName}>
          {children}
          {expandedKeys.size > 0 && <View style={{ height: height * 0.6 }} />}
        </View>
      </ScrollView>
    </FormScrollContext.Provider>
  )
}

// Вне FormScrollView поле просто работает без прокрутки к нему.
const NOOP_CONTEXT: FormScrollContextValue = { expand: () => {}, collapse: () => {} }

export function useFormScroll(): FormScrollContextValue {
  return useContext(FormScrollContext) ?? NOOP_CONTEXT
}
