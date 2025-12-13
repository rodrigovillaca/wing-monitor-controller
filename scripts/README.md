# Diagnostic Scripts

This directory contains standalone scripts to help troubleshoot connection issues with the Behringer Wing console.

## Prerequisites

- Node.js installed
- Dependencies installed (`npm install` or `pnpm install` in the root directory)

## 1. Raw OSC Test (`test-raw-osc.js`)

This script bypasses the application logic and uses the `osc` library directly to send UDP packets. Use this to verify that your computer can physically talk to the Wing console.

### Usage

1. Open `scripts/test-raw-osc.js`
2. Edit the configuration at the top:
   ```javascript
   const WING_IP = '192.168.1.50'; // Change to your Wing IP
   const WING_PORT = 2223;         // Default Wing OSC port
   const LOCAL_PORT = 9000;        // Local port to listen on
   ```
3. Run the script:
   ```bash
   node scripts/test-raw-osc.js
   ```

### Expected Behavior
- You should see "UDP Port is ready!"
- The fader on **Channel 40** should move to **75%**.
- After 2 seconds, the fader should move back to **0%**.
- You should see "Received OSC Message" logs if the console is replying.

---

## 2. Library Logic Test (`test-lib-osc.ts`)

This script tests the `WingMonitorController` class logic in isolation. Use this to verify that the application's internal logic is correctly handling state and commands.

### Usage

1. Open `scripts/test-lib-osc.ts`
2. Edit the configuration object:
   ```typescript
   network: {
     ipAddress: '192.168.1.50', // Change to your Wing IP
     wingPort: 2223,
     localPort: 9001
   }
   ```
3. Run the script using `ts-node` (requires `ts-node` to be installed globally or locally):
   ```bash
   npx ts-node scripts/test-lib-osc.ts
   ```

### Expected Behavior
- You should see "Controller Ready!"
- The Main Monitor Volume should set to **50%**.
- After 2 seconds, it should set to **0%**.
