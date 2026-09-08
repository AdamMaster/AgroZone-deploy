import pathlib

p = pathlib.Path("server/src/conversations/conversations.module.ts")
s = p.read_text(encoding="utf-8")

def replace_once(s, old, new):
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    return s.replace(old, new)

s = replace_once(
    s,
    "import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'\nimport { PrismaService } from '@/prisma/prisma.service'",
    "import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'\nimport { NotificationsModule } from '@/notifications/notifications.module'\nimport { PrismaService } from '@/prisma/prisma.service'"
)

s = replace_once(
    s,
    "  imports: [UserModule, AuthModule, BlockedUsersModule],",
    "  imports: [UserModule, AuthModule, BlockedUsersModule, NotificationsModule],"
)

p.write_text(s, encoding="utf-8")
print("OK")
