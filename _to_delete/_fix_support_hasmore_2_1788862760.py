import pathlib

def replace_once(path, old, new, label):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    assert n == 1, f"{label} ({path}): expected exactly 1 occurrence, got {n}"
    p.write_text(s.replace(old, new), encoding="utf-8")

# ── 1. use-support-my-messages.ts — useEffect -> render-time adjustment ──
MY_PATH = "client/src/components/features/support/hooks/use-support-my-messages.ts"

replace_once(
    MY_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useRef, useState } from 'react'",
    "my-messages imports",
)

replace_once(
    MY_PATH,
    """  const messages = useMemo(() => query.data ?? [], [query.data])

  useEffect(() => {
    if (!initialCheckDone.current && query.data) {
      initialCheckDone.current = true

      if (query.data.length < PAGE_SIZE) {
        setHasMore(false)
      }
    }
  }, [query.data])
""",
    """  const messages = useMemo(() => query.data ?? [], [query.data])

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
    "my-messages hook body",
)

# ── 2. use-support-admin-messages.ts — useEffect -> render-time adjustment ──
ADMIN_PATH = "client/src/components/features/support/hooks/use-support-admin-messages.ts"

replace_once(
    ADMIN_PATH,
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
    "import { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useCallback, useMemo, useRef, useState } from 'react'",
    "admin-messages imports",
)

replace_once(
    ADMIN_PATH,
    """  const messages = useMemo(() => query.data ?? [], [query.data])

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
    """  const messages = useMemo(() => query.data ?? [], [query.data])

  // Та же логика, что и у useSupportMyMessages: первая страница тикета
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
    "admin-messages hook body",
)

print("OK")
