import { Fragment, type ReactNode, createContext, useCallback, useContext, useEffect, useId, useState } from 'react'
import { View } from 'react-native'

type MountPortal = (key: string, node: ReactNode | null) => void

const PortalContext = createContext<MountPortal | null>(null)

// Слой поверх всего экрана для элементов, которые объявлены глубоко внутри
// (например, в шапке прокручиваемого списка), а рисоваться должны над всем
// содержимым экрана: затемнение и подсказки поиска. В отличие от Modal,
// это не отдельное окно — поле ввода под ним не теряет фокус и клавиатуру.
export function PortalHost({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<ReadonlyMap<string, ReactNode>>(new Map())

  const mount = useCallback<MountPortal>((key, node) => {
    setNodes(current => {
      const next = new Map(current)
      if (node === null) {
        next.delete(key)
      } else {
        next.set(key, node)
      }
      return next
    })
  }, [])

  return (
    <PortalContext.Provider value={mount}>
      {children}
      {nodes.size > 0 && (
        <View pointerEvents='box-none' className='absolute inset-0'>
          {[...nodes].map(([key, node]) => (
            <Fragment key={key}>{node}</Fragment>
          ))}
        </View>
      )}
    </PortalContext.Provider>
  )
}

// Содержимое рисуется в ближайшем PortalHost (экран вкладки — TabScreen).
export function Portal({ children }: { children: ReactNode }) {
  const mount = useContext(PortalContext)
  const key = useId()

  if (!mount) throw new Error('Portal: нет PortalHost выше по дереву')

  useEffect(() => {
    mount(key, children)
  }, [mount, key, children])

  useEffect(() => () => mount(key, null), [mount, key])

  return null
}
