import pathlib

def replace_once(path, old, new, label):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    assert n == 1, f"{label} ({path}): expected exactly 1 occurrence, got {n}"
    p.write_text(s.replace(old, new), encoding="utf-8")

# ── 1. use-support-my-messages.ts ──────────────────────────────────────
MY_PATH = "client/src/components/features/support/hooks/use-support-my-messages.ts"

replace_once(
    MY_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
    "my-messages imports",
)

replace_once(
    MY_PATH,
    """export function useSupportMyMessages(enabled: boolean) {
  const queryClient = useQueryClient()
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const query = useQuery({
    queryKey: ['support-my-messages'],
    queryFn: () => supportService.getMyMessages({ limit: PAGE_SIZE }),
    enabled
  })

  const messages = useMemo(() => query.data ?? [], [query.data])
""",
    """export function useSupportMyMessages(enabled: boolean) {
  const queryClient = useQueryClient()
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Первая страница уже может быть неполной (например, у тикета всего
  // одно сообщение) — тогда "показывать дальше" нечего с самого начала,
  // ещё до первого клика на "Показать предыдущие". Без этой проверки
  // hasMore так и оставался бы true (он выставляется в false только
  // внутри loadOlder), и кнопка светилась бы даже когда истории больше
  // нет. Ref, а не просто условие в эффекте — чтобы не переопределить
  // hasMore=false обратно на true при повторных срабатываниях эффекта
  // после того как loadOlder уже дозагрузил более старые сообщения.
  const initialCheckDone = useRef(false)

  const query = useQuery({
    queryKey: ['support-my-messages'],
    queryFn: () => supportService.getMyMessages({ limit: PAGE_SIZE }),
    enabled
  })

  const messages = useMemo(() => query.data ?? [], [query.data])

  useEffect(() => {
    if (!initialCheckDone.current && query.data) {
      initialCheckDone.current = true

      if (query.data.length < PAGE_SIZE) {
        setHasMore(false)
      }
    }
  }, [query.data])
""",
    "my-messages hook body",
)

# ── 2. use-support-admin-messages.ts ───────────────────────────────────
ADMIN_PATH = "client/src/components/features/support/hooks/use-support-admin-messages.ts"

replace_once(
    ADMIN_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
    "admin-messages imports",
)

replace_once(
    ADMIN_PATH,
    """  const query = useQuery({
    queryKey: ['support-admin-messages', conversationId],
    queryFn: () => supportService.getAdminMessages(conversationId as string, { limit: PAGE_SIZE }),
    enabled: !!conversationId
  })

  const messages = useMemo(() => query.data ?? [], [query.data])
""",
    """  const query = useQuery({
    queryKey: ['support-admin-messages', conversationId],
    queryFn: () => supportService.getAdminMessages(conversationId as string, { limit: PAGE_SIZE }),
    enabled: !!conversationId
  })

  const messages = useMemo(() => query.data ?? [], [query.data])

  // Та же логика, что и у useSupportMyMessages: первая страница тикета
  // может сразу оказаться неполной (мало сообщений), и тогда "Показать
  // предыдущие" показывать не за чем ещё до первого loadOlder. Ref
  // хранит conversationId, для которого уже сделали эту проверку — при
  // переключении админом на другой тикет (см. trackedConversationId
  // выше) query.data ещё не готов в момент сброса hasMore=true, эффект
  // довыполнит проверку сам, как только данные придут.
  const initialCheckedConversationId = useRef<string | null>(null)

  useEffect(() => {
    if (conversationId && query.data && initialCheckedConversationId.current !== conversationId) {
      initialCheckedConversationId.current = conversationId

      if (query.data.length < PAGE_SIZE) {
        setHasMore(false)
      }
    }
  }, [conversationId, query.data])
""",
    "admin-messages hook body",
)

print("OK")
