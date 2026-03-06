# 🚀 HyperLink: High-Speed P2P File Sharing

HyperLink is a next-generation file transfer tool that allows people to send massive files (even 10GB+) directly to each other without using a middleman server to store the data.

## 💡 The Problem
Usually, when you send a file (like on WhatsApp or Google Drive), the file goes from your computer to a giant server, sits there, and then the other person downloads it. This is slow for big files and costs money for storage.

## 🛠️ The Solution (How it Works)
HyperLink uses **Peer-to-Peer (P2P)** technology. Think of it like a phone call for data:
- **Direct Connection**: Once two people "find" each other, the file flows directly from one computer to the other.
- **Encryption**: Every byte of the file is encrypted before it leaves the sender's device and is only decrypted on the receiver's device, ensuring that even if there were a middleman, they couldn't read the data.
- **Zero-Memory Magic**: We don't load the whole file into the computer's memory. Instead, we send it in tiny pieces (like a bucket brigade) so the browser doesn't crash.
- **Save-as-you-go**: Instead of waiting for the whole file to finish, the receiver saves those tiny pieces directly to their browser's storage (IndexedDB) as they arrive.

## 🏗️ The "Engine Room" (Our Tech Stack)
To make this happen, we use a few key components:

| Component | What it is | Analogy |
| :--- | :--- | :--- |
| **Next.js** | The Website Framework | The **Building** where everything happens. |
| **WebRTC & PeerJS** | The P2P Engine | The **Telephone Line** that connects the two people directly. |
| **Signaling Server** | Discovery Assistant | The **Operator** who helps the two callers find each other's phone numbers. |
| **Supabase** | Database & Security | The **Logbook** that keeps track of who is logged in and what files were sent (but not the files themselves!). |
| **IndexedDB** | Browser Storage | The **Local Warehouse** where the incoming file pieces are stored until the file is complete. |

## 🛡️ Security & Privacy
One of the biggest concerns for any file transfer tool is safety:
- **No Storage**: The files are never stored on any cloud server. If a hacker breaks into our database, they won't find a single document—just a list of timestamps and file names.
- **End-to-End Encryption**: The connection between peers is automatically encrypted by the WebRTC protocol, meaning it's virtually impossible for anyone to "listen in" on the transfer.

## 🧱 Technical Constraints (The "Caveats")
Every system has its limits, and a committee might ask about these:
- **The Browser's Storage**: Since we save files to the browser's internal warehouse (IndexedDB), the maximum file size you can receive depends on your computer's free disk space and how much the browser allows us to use (usually about 50% of your total free space).
- **Both Must Be Online**: Since the transfer is direct, both the sender and receiver must have the HyperLink website open at the same time. If one person closes their browser, the transfer will pause.

## ✨ Key Features
- **No File Limits**: Send 10GB, 50GB, or more. If your hard drive has space, HyperLink can handle it.
- **Privacy First**: Files never live on our servers. They only exist on the sender's and receiver's devices.
- **High Speed**: Since there's no middleman, the speed is only limited by your internet connection.
- **Transfer History**: Even though we don't store the files, you can see a history of what you've sent and received.

---

