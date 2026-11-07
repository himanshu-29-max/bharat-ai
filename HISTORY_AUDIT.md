# History Audit & Verification Report (Task 2)

## 1. Root Causes Discovered
- **Flaw 1 (Fake-Save Bug)**: `saveChat` previously executed `await fetch("/api/history", POST)` without validating `res.ok`. When Redis was unconfigured, unreachable, or timed out, the UI still optimistically added the chat to the sidebar, leading to silent disappearance upon page refresh.
- **Flaw 2 (1500ms Debounce Loss)**: Chat saving was queued in a 1500ms debounce timer (`setTimeout`). If the user navigated away, opened a new chat, or refreshed the page within this 1.5-second window, the chat was lost permanently.
- **Flaw 3 (Server Hiding Failures as Empty State)**: `GET /api/history` previously caught all Redis/server errors and returned `HTTP 200 { chats: [], messages: [] }`. This caused database outages to masquerade as an empty chat history.
- **Flaw 4 (Missing Local Backup Mirror)**: No client-side offline storage existed; temporary network hiccups or database reboots purged the user's active session views.
- **Flaw 5 (Uploaded Image Payload Bloat)**: Attaching high-res images previously embedded huge base64 strings directly into the message history array, which exceeded Redis payload limits and broke chat serialization.

---

## 2. Fixes Applied
1. **Immediate Execution**: Eliminated the 1500ms debounce; chats are saved immediately once the bot reply is received.
2. **Reliable Unload Hook**: Added `window.addEventListener("beforeunload", ...)` using `fetch(..., { keepalive: true })` to guarantee no pending exchange is lost when tabs close.
3. **Honest HTTP Errors**: `GET /api/history` and `POST /api/history` now return **HTTP 500** with explicit error reasons when Redis is missing or fails.
4. **Resilient LocalStorage Mirror**: All chats are mirrored immediately in `localStorage` under `bharat-ai:history:<email>`. Upon startup, server history and local history are reconciled by `chatId` preserving the newest `updatedAt`. If the database is temporarily offline, chats continue to load seamlessly from local cache with an informative warning banner.
5. **Payload Optimization**: Omitted raw `data:` image base64 strings from long-term Redis storage while keeping Pollinations generated image URLs and file names intact.

---

## 3. Repro Sequence Results

| Step | Action | Before Fix | After Fix (Tested) | Status |
|---|---|---|---|---|
| **1** | Send message & inspect `POST /api/history` | Debounced by 1500ms; response ignored; optimistic UI assumed success. | Immediate POST call; validates `res.ok`; writes immediately to local storage mirror; retries after 2s on network failure. | **PASS** |
| **2** | Refresh page | Chat vanished on refresh whenever Redis was offline/failed. | Chat persists from server or immediate local cache mirror without data loss. | **PASS** |
| **3** | Logout &rarr; Login again | History disappeared if Redis was offline. | History persists for the authenticated email account in both database and synced client cache. | **PASS** |
| **4** | Click chat in sidebar | Loading failed silently into blank screen on error. | Messages load cleanly; falls back to local backup cache if server request encounters error. | **PASS** |
| **5** | Generate image & reopen chat | Generated image dropped or failed on refresh. | Generated image URL is stored and reloaded in the chat view with action buttons. | **PASS** |
