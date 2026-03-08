# 🕳️ HyperLink: App Analysis (The "Holes")

After digging into the guts of the code, here are the real-world "holes" and technical risks I found in the current implementation. These are things a savvy teacher or committee member might spot if they ask about edge cases.

## ~~1. Implement "Direct-to-Disk" Pipeline (Streaming)~~ (Done)
**Current Problem**:
- **The "Warehouse" Model**: Chunks are stored in IndexedDB (a "hidden warehouse").
- **The Assembly Freeze**: At 100%, the browser must sort and combine thousands of tiny pieces into one big file. This causes a massive CPU/UI freeze on large (10GB+) transfers.
- **Storage Waste**: Requires 2x the file size (10GB in the warehouse + 10GB for the final file).
- **Ghost Storage**: If a transfer fails or the tab is closed mid-way, the partial chunks stay in IndexedDB forever, eating up the user's disk space with no way for them to see or delete it.

**Task / Logic Fix**:
- **The Pipeline**: Use the **File System Access API** to write chunks directly to the final destination in real-time.
- **User UX**: Prompt the user to pick a folder **before** the transfer starts.
- **Crash Recovery**: If it fails at 50%, the user sees a partial file on their disk they can delete manually.
- **Startup Sweeper**: Implement a "Garbage Collector" that runs when the app opens, checks for abandoned transfers in IndexedDB, and deletes them to free up space.
- **Native Fallback**: Detect mobile/Safari and automatically fall back to the current IndexedDB method (Progressive Enhancement).

## ~~2. Resolve "Lost ACK" Handshake Deadlock (Done)~~
~~**Current Problem**:~~
~~- **The "Blind Faith" Model**: The app sends a window of 16 chunks and waits for confirmations (ACKs) to "slide" forward.~~
~~- **Deadlock Risk**: If a single ACK message is lost in transit, the sender's `activeChunks` counter never drops. The sender thinks the receiver is still busy and hangs indefinitely.~~
~~- **The Result**: Transfers get stuck at random percentages (e.g., 42% or 99%) with no error message, forcing the user to restart.~~

~~**Task / Logic Fix**:~~
~~- ✅ **Task 2: ACK Resilience**. Added `chunk-probe` heartbeat to `FileSender`, idempotent handling in `FileReceiver`, and wired up routing in `useReceiveTransfer`.~~

## ~~3. Secure Signaling with JWT Authentication (Done)~~
~~**Current Problem**:~~
~~- **The "Open Door" Model**: The signaling server (`apps/signaling`) accepts WebSocket connections from anyone without checking credentials.~~
~~- **Privacy Leak**: Anyone can ask the server for a list of active Peer IDs, allowing them to "scan" which users are currently online.~~
~~- **Abuse Risk**: Anonymous users could flood the signaling server with fake connections, causing a Denial of Service (DoS) for legitimate users.~~

~~**Task / Logic Fix**:~~
~~- ✅ **Implemented**. Added `jsonwebtoken` verification middleware to the signaling server using `SUPABASE_JWT_SECRET`.~~
~~- **Client-Side Auth**: Updated the Web Application (`PeerManager` and hooks) to fetch a fresh session token from Supabase before initializing the signaling connection.~~
~~- **Restrict Discovery**: Only authenticated peers can reach the signaling logic.~~

## ~~4. Bulletproof Firewall & NAT Traversal (Done)~~
~~**Current Problem**:~~
~~- **STUN Dependency**: The app relies on STUN for discovery. While STUN works at home, it fails on strict corporate, school, or university networks (Symmetric NAT).~~
~~- **Siloed TURN**: If the primary TURN server is down or hits its bandwidth limit, the app has no backup. Users on secure networks will simply be unable to connect.~~
~~- **Generic Errors**: When a firewall blocks a transfer, the user gets a "failed" message but no explanation as to *why*.~~

~~**Task / Logic Fix**:~~
~~    - [x] Task 4: NAT Traversal (Firewall Reliability)~~
~~    - [x] Plan implementation and get approval~~
~~    - [x] Add redundant TURN providers to `/api/turn-credentials`~~
~~    - [x] Implement ICE diagnostics in `PeerManager`~~
~~    - [x] Add "Compatibility Mode" (Forced Relay) to Settings~~
~~    - [x] Add "Firewall Blocked" UI notifications in hooks~~
~~    - [x] Verify with documentation and mock logic~~

## 5. Synchronized Persistent Transfer State
**Current Problem**:
- **Transient Memory**: The app's knowledge of a transfer is stored in React state (RAM). If the tab is refreshed, that state is lost.
- **Disconnected DB**: While chunks are saved to disk (IndexedDB), the `status` of the transfer in Supabase isn't updated frequently enough to be used for recovery.
- **Manual Intervention**: If a transfer is interrupted by a refresh, the users must manually re-initiate the connection to benefit from those saved chunks.

**Task / Logic Fix (Persistent State)**:
- **Stable Identity Mapping**: Link volatile PeerIDs to stable Supabase User IDs. Client updates `profiles.last_peer_id` on every mount so partners can re-discover them via DB lookup.
- **Immediate State Syncing**: Every `pause`, `resume`, or `stall` (from Task 2) triggers an immediate Supabase `UPDATE` to the `transfers` table.
- **File Re-attachment UI**: Browsers can't "auto-remember" file paths. 
    - **UX**: Show a "⚠️ Re-attach 'file.zip' to resume" button in the Sender's history.
    - **Verify**: Use a SHA-256 hash or (size + name) check to ensure the re-attached file matches the original.
- **Auto-Recovery Handshake**:
    - **Offer**: Sender sends a `file-offer` with the original `dbTransferId`.
    - **Resume-From**: Receiver replies with a `resume-from` message containing the last successful chunk index from IndexedDB.
- **Garbage Collection (The "Sweeper")**: 
    - **Trigger**: Run on app mount or when storage > 80% full.
    - **Rule**: Auto-delete any IndexedDB chunks belonging to transfers that have been inactive/stale for > 7 days.
    - **Manual**: Clicking [Cancel/Trash] in History triggers immediate background cleanup.

## ~~6. Safe Batched Deletion for 1M+ Chunks~~ (Done)
~~**Current Problem**:~~
~~- **The "Memory Bomb"**: For a 50GB file (1,000,000 chunks), calling `index.getAllKeys()` attempts to load 1 million IDs into RAM at once.~~
~~- **The Crash**: Browsers often crash or hit "Database Busy" lockouts when trying to fetch or delete such a massive volume of records in a single synchronous call.~~
~~- **UI Lockup**: Even if it doesn't crash, the main thread is blocked while the database is busy, making the website non-responsive for the user.~~

~~**Task / Logic Fix**:~~
~~- **Cursor-Based Iteration**: Replace `getAllKeys()` with a `db.transaction().cursor()` that walks through chunks one by one.~~
~~- **Batched Deletes**: Delete chunks in chunks of **5,000** per transaction.~~
~~- **Main-Thread Yielding**: Use `setTimeout(0)` or `requestIdleCallback` between batches to allow the browser to process UI events (scrolling, clicking).~~
~~- **Progress Tracking**: Update the UI with a "Cleaning up storage..." progress bar so the user knows why disk space isn't appearing immediately.~~

## ~~7. Active Transfer Keep-Alive (Wake Lock)~~ (Done)
~~**Current Problem**:~~
~~- **Background Throttling**: Browsers aggressively throttle or "freeze" JavaScript in background tabs to save power, which can drop WebRTC connections.~~
~~- **System Sleep**: If the user's computer goes to sleep during a long (30min+) transfer, the network interface is powered down, causing the transfer to fail.~~
~~- **Transfer Failure**: Long transfers are currently unreliable unless the user actively moves their mouse or keeps the tab in the foreground.~~

~~**Task / Logic Fix**:~~
~~- **Screen Wake Lock API**: Implement `navigator.wakeLock` to prevent the screen from dimming or the system from sleeping while a transfer is `transferring`.~~
~~- **Visibility Handling**: Use the `Page Visibility API` to detect when the tab goes to the background and trigger a "Keep-alive" notification to the user.~~
~~- **Automatic Release**: Ensure the wake lock is released immediately upon `complete`, `failed`, or `cancelled` states to respect the user's battery life.~~
~~- **UI Indicator**: Show a small "System Stay-Awake Active" icon near the progress bar so the user knows why their screen isn't turning off.~~

## ~~8. High-Bandwidth Dynamic Chunking~~ (Done)
**Current Problem**:
- **ACK Overhead**: Using a fixed 64KB chunk size means a 10GB file requires ~160,000 individual acknowledgment messages.
- **Speed Bottleneck**: On high-speed Fiber connections (1Gbps+), the CPU overhead of processing 2,000+ ACKs per second becomes the bottleneck, preventing the app from hitting its true potential speed.
- **Latency Sensitivity**: On long-distance connections (high ping), the "Sliding Window" stalls while waiting for ACKs, even if the bandwidth is wide open.

**Task / Logic Fix**:
- **Adaptive Sizing**: Implement a "Slow Start" algorithm. Start at 64KB and increase to 256KB, 512KB, or 1MB if ACKs are returned consistently within <100ms.
- **Congestion Control**: If a chunk fails (Lost ACK) or latency spikes, immediately half the chunk size to reduce network congestion (similar to TCP Reno).
- **Buffer Monitoring**: Use `dataChannel.bufferedAmount` to adjust the window size in real-time, preventing the browser's outgoing buffer from overflowing.
- **UI "Turbo" Indicator**: Show the current chunk size in a "Technical Details" menu so users can see the app optimizing for their speed.

## ~~9. Secure & Reliable Identity Generation~~ (Done)
~~**Current Problem**:~~
~~- **Weak Entropy**: The fallback `Date.now() + Math.random()` is not cryptographically secure and can lead to Peer ID collisions in non-secure (HTTP) contexts or older browsers.~~
~~- **Database Overwrites**: If two users generate the same Peer ID, their transfer metadata in the `transfers` table may collide, leading to data corruption or cross-user privacy leaks.~~
~~- **Predictable IDs**: A predictable ID allows a malicious actor to "guess" Peer IDs and attempt unauthorized connections more easily.~~

~~**Task / Logic Fix**:~~
~~- **Secure Context Check**: Ensure the app detects `isSecureContext`. If `false`, warn the user that P2P features are disabled until they use HTTPS.~~
~~- **Robust Fallback**: Use a cryptographic seed (like `crypto.getRandomValues`) even in the fallback logic to ensure high entropy.~~
~~- **Supabase-Linked IDs**: Use the `user.id` as a salt or prefix for the generated Peer ID, ensuring that even if the random part collides, the overall ID remains unique to that specific user.~~
~~- **Validation**: Add a check on the signaling server to ensure no two peers can register with the same ID at the same time.~~

## 💡 Future App Ideas
Beyond fixing holes, here are some "Big Brain" ideas to make HyperLink even better:
- **Local Network Mode**: Detect peers on the same Wi-Fi and use a "Local Discovery" protocol to send files at lightning speed without even needing the signaling server.
- **QR Code "Scan-to-Receive"**: Mobile users can just scan a QR code on the sender's screen to instantly connect and start downloading.
- **On-the-fly Compression**: Automatically compress text files or codebases before sending to save bandwidth and increase speed.
- **Hyper-Swarm**: If multiple people are sending the same file (like a class handout), a receiver could download different chunks from multiple people at once (BitTorrent style).

---
*This analysis is intended for developers and technical stakeholders to guide future improvements.*
