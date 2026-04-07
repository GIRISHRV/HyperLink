# Page Object Models

This directory contains Page Object Models (POMs) for the HyperLink E2E test suite. Page objects encapsulate page interactions and provide a clean, maintainable API for test scripts.

## Available Page Objects

### SendPage (`send-page.ts`)
Encapsulates interactions with the file sending interface (`/send`).

**Methods:**
- `goto()` - Navigate to the send page
- `selectFile(filePath)` - Select a single file for transfer
- `selectMultipleFiles(filePaths)` - Select multiple files for transfer
- `enterReceiverPeerId(peerId)` - Enter the receiver's peer ID
- `setEncryptionPassword(password)` - Set an encryption password
- `initiateTransfer()` - Start the file transfer
- `pauseTransfer()` - Pause the ongoing transfer
- `resumeTransfer()` - Resume a paused transfer
- `cancelTransfer()` - Cancel the ongoing transfer
- `getTransferProgress()` - Get current progress percentage
- `getTransferStatus()` - Get current transfer status
- `verifyTransferComplete()` - Verify transfer completed successfully

### ReceivePage (`receive-page.ts`)
Encapsulates interactions with the file receiving interface (`/receive`).

**Methods:**
- `goto()` - Navigate to the receive page
- `getPeerId()` - Get the assigned peer ID
- `acceptTransfer()` - Accept an incoming transfer
- `rejectTransfer()` - Reject an incoming transfer
- `enterDecryptionPassword(password)` - Enter decryption password
- `pauseTransfer()` - Pause the ongoing transfer (halt downlink)
- `resumeTransfer()` - Resume a paused transfer
- `getTransferProgress()` - Get current progress percentage
- `getTransferStatus()` - Get current transfer status
- `downloadFile()` - Download the received file
- `verifyTransferComplete()` - Verify transfer completed successfully

### DashboardPage (`dashboard-page.ts`)
Encapsulates interactions with the dashboard interface (`/dashboard`).

**Methods:**
- `goto()` - Navigate to the dashboard page
- `getTotalDataMoved()` - Get total data moved statistic
- `getTotalTransfers()` - Get total number of transfers
- `getRecentTransfers()` - Get list of recent transfers
- `navigateToHistory()` - Navigate to the history page
- `verifyStatsLoaded()` - Verify dashboard stats have loaded

## Usage Example

```typescript
import { test, expect, chromium } from "@playwright/test";
import { SendPage, ReceivePage } from "./page-objects";
import path from "path";

test("transfer using page objects", async () => {
  const browser = await chromium.launch();
  
  // Create page objects
  const receiverContext = await browser.newContext({ 
    storageState: RECEIVER_AUTH_FILE 
  });
  const senderContext = await browser.newContext({ 
    storageState: SENDER_AUTH_FILE 
  });
  
  const receivePage = new ReceivePage(await receiverContext.newPage());
  const sendPage = new SendPage(await senderContext.newPage());
  
  try {
    // Setup receiver
    await receivePage.goto();
    const peerId = await receivePage.getPeerId();
    
    // Setup sender
    await sendPage.goto();
    await sendPage.selectFile(path.resolve(__dirname, "fixtures/test-file.txt"));
    await sendPage.enterReceiverPeerId(peerId);
    
    // Execute transfer
    await sendPage.initiateTransfer();
    await receivePage.acceptTransfer();
    
    // Verify completion
    await sendPage.verifyTransferComplete();
    await receivePage.verifyTransferComplete();
  } finally {
    await receiverContext.close();
    await senderContext.close();
    await browser.close();
  }
});
```

## Benefits

1. **Maintainability**: Changes to UI selectors only need to be updated in one place
2. **Readability**: Tests read like user actions rather than technical implementation
3. **Reusability**: Common workflows can be shared across multiple tests
4. **Type Safety**: TypeScript provides autocomplete and type checking
5. **Encapsulation**: Page-specific logic is isolated from test logic

## Design Principles

- Each page object represents a single page or component
- Methods represent user actions or queries
- Assertions are kept in tests, not page objects (except for internal waits)
- Page objects return data or void, not Playwright locators
- All waits and error handling are encapsulated within methods
