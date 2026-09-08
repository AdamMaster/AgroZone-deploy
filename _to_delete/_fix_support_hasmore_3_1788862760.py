import pathlib

def replace_once(path, old, new, label):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    assert n == 1, f"{label} ({path}): expected exactly 1 occurrence, got {n}"
    p.write_text(s.replace(old, new), encoding="utf-8")

# ── 1. use-support-my-messages.ts — useRef -> useState (refs forbidden during render by lint) ──
MY_PATH = "client/src/components/features/support/hooks/use-support-my-messages.ts"

replace_once(
    MY_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useRef, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useState } from 'react'",
    "my-messages imports",
)

replace_once(
    MY_PATH,
    """  // Первая страница уже может быть неполной (например, у тикета всего
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

  // Adjusting state during render (не в useEffect — см. eslint
  // react-hooks/set-state-in-effect и уже принятый в этом файле для
  // trackedConversationId паттерн, https://react.dev/learn/you-might-not-need-an-effect).
  if (!initialCheckDone.current && query.data) {
    initialCheckDone.current = true

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }
""",
    """  // Первая страница уже может быть неполной (например, у тикета всего
  // одно сообщение) — тогда "показывать дальше" нечего с самого начала,
  // ещё до первого клика на "Показать предыдущие". Без этой проверки
  // hasMore так и оставался бы true (он выставляется в false только
  // внутри loadOlder), и кнопка светилась бы даже когда истории больше
  // нет. Именно useState, а не useRef — refs нельзя трогать во время
  // рендера (eslint react-hooks/refs), а adjusting state during render
  // (https://react.dev/learn/you-might-not-need-an-effect) требует
  // именно состояния для сравнения.
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  const query = useQuery({
    queryKey: ['support-my-messages'],
    queryFn: () => supportService.getMyMessages({ limit: PAGE_SIZE }),
    enabled
  })

  const messages = useMemo(() => query.data ?? [], [query.data])

  if (!initialCheckDone && query.data) {
    setInitialCheckDone(true)

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }
""",
    "my-messages hook body",
)

# ── 2. use-support-admin-messages.ts — useRef -> useState ──
ADMIN_PATH = "client/src/components/features/support/hooks/use-support-admin-messages.ts"

replace_once(
    ADMIN_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useRef, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useState } from 'react'",
    "admin-messages imports",
)

replace_once(
    ADMIN_PATH,
    """  // Та же логика, что и у useSupportMyMessages: первая страница тикета
  // может сразу оказаться неполной (мало сообщений), и тогда "Показать
  // предыдущие" показывать не за чем ещё до первого loadOlder. Ref
  // хранит conversationId, для которого уже сделали эту проверку —
  // выставляется прямо в теле рендера (adjusting state during render,
  // как и trackedConversationId выше), а не в useEffect: при переключении
  // на другой тикет query.data ещё не готов в момент сброса hasMore=true
  // (см. блок trackedConversationId), а как только данные придут —
  // сработает уже здесь, на очередном рендере.
  const initialCheckedConversationId = useRef<string | null>(null)

  if (conversationId && query.data && initialCheckedConversationId.current !== conversationId) {
    initialCheckedConversationId.current = conversationId

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }
""",
    """  // Та же логика, что и у useSupportMyMessages: первая страница тикета
  // может сразу оказаться неполной (мало сообщений), и тогда "Показать
  // предыдущие" показывать не за чем ещё до первого loadOlder.
  // initialCheckedConversationId хранит conversationId, для которого уже
  // сделали эту проверку — состояние, а не ref (refs нельзя трогать во
  // время рендера, eslint react-hooks/refs), выставляется прямо в теле
  // рендера, как и trackedConversationId выше: при переключении на
  // другой тикет query.data ещё не готов в момент сброса hasMore=true
  // (см. блок trackedConversationId), а как только данные придут —
  // сработает уже здесь, на очередном рендере.
  const [initialCheckedConversationId, setInitialCheckedConversationId] = useState<string | null>(null)

  if (conversationId && query.data && initialCheckedConversationId !== conversationId) {
    setInitialCheckedConversationId(conversationId)

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }
""",
    "admin-messages hook body",
)

print("OK")
