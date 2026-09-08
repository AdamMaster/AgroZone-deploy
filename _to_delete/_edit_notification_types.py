import pathlib

p = pathlib.Path("client/src/components/features/notifications/types/notification.types.ts")
s = p.read_text(encoding="utf-8")

def replace_once(s, old, new):
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    return s.replace(old, new)

old = """// Пока единственный тип — отклонение объявления модератором (см.
// обсуждение с пользователем), но enum на бэкенде сделан расширяемым, тип
// здесь зеркалит это же намерение.
export type NotificationType = 'AD_REJECTED'"""

new = """// Enum на бэкенде расширяемый (см. NotificationType в schema.prisma), тип
// здесь зеркалит это же намерение. Компоненты рендерят title/message/link
// полностью generic, без switch по типу — новое значение добавляется сюда
// без изменений в компонентах.
export type NotificationType = 'AD_REJECTED' | 'NEW_MESSAGE'"""

s = replace_once(s, old, new)
p.write_text(s, encoding="utf-8")
print("OK")
