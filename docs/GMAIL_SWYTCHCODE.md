# Gmail ↔ ResolveAI operation mapping (from real Swytchcode manifest)

Fetched with: `swytchcode get gmail` → integration `Gmail.gmail@v1`

| ResolveAI function | Swytchcode canonical ID | Purpose |
|---|---|---|
| `getGmailConnection()` | `gmail.user.profile.get` | Authenticated mailbox profile |
| `listSupportTickets()` | `gmail.user.threads.get` | List/search support threads (`q`) |
| `getTicketThread(threadId)` | `gmail.user.threads.get1` | Read full thread (ticket history) |
| (message details / reply headers) | `gmail.user.messages.get1` | Read one message |
| `replyToTicket(threadId, body)` | `gmail.user.send.create1` | Send/reply (`raw` + `threadId`) |
| (optional label filter discovery) | `gmail.user.labels.get` | List labels |
| (optional label apply) | `gmail.user.modify.create1` | Add/remove thread labels |

Allowlisted app ops → IDs (see `src/lib/swytchcode/allowlist.ts`):

- `gmail.profile` → `gmail.user.profile.get`
- `gmail.threads.list` → `gmail.user.threads.get`
- `gmail.threads.get` → `gmail.user.threads.get1`
- `gmail.messages.get` → `gmail.user.messages.get1`
- `gmail.messages.list` → `gmail.user.messages.get`
- `gmail.messages.send` → `gmail.user.send.create1`
- `gmail.labels.list` → `gmail.user.labels.get`
- `gmail.threads.modify` → `gmail.user.modify.create1`

Auth: OAuth2 via Swytchcode (`swytchcode auth connect Gmail`). Never store Gmail passwords/tokens in the frontend.

Not enabled (by design): delete, trash, batch delete, arbitrary mailbox mutation.
