import { useEffect } from 'react'

export function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled: boolean,
  ignoreSelector?: string
) {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      const isInside = refs.some(ref => ref.current?.contains(target))
      if (isInside) return

      if (ignoreSelector && target.closest(ignoreSelector)) return

      handler()
    }

    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [refs, handler, enabled, ignoreSelector])
}
