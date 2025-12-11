# Wing Studio Monitor Controller

A custom web application and Node.js library to turn your **Behringer Wing Rack** console into a high-end **Studio Monitor Controller**.

![Wing Monitor Controller UI](https://raw.githubusercontent.com/manus-ai/wing-monitor-controller/main/docs/screenshot.png)

## Overview

This project consists of two main components:

1.  **`wing-studio-monitor-controller`**: A reusable Node.js library that handles OSC communication with the Wing console, managing state, routing, and logic (e.g., subwoofer crossover, mono, dim).
2.  **Web Application**: A React-based frontend with a **Neumorphic (Soft UI)** design that mimics the look and feel of physical hardware.

## Features

-   **Hardware-like UI**: Realistic volume knob, tactile buttons, and LED indicators.
-   **Input Source Selection**: Switch between multiple sources (DAW, Reference, Client, etc.).
-   **Speaker Switching**: Toggle between Main Monitors, Nearfields, and Mini Cubes.
-   **Subwoofer Control**: Enable/disable subwoofer. **Note:** Crossover EQ must be configured manually on the console; this app simply toggles the EQ on/off on the main speakers when the sub is active.
-   **Monitor Functions**:
    -   **Dim**: Attenuate volume by 20dB.
    -   **Mute**: Cut all audio.
    -   **Mono**: Sum stereo signal to mono for phase checking.
    -   **Polarity Flip**: Invert phase on one channel for null testing.
    -   **Talkback**: Toggle talkback microphone (state tracking).
-   **Real-time Sync**: Bidirectional communication ensures the UI always reflects the console state.

## Project Structure

```
wing-monitor-controller-web/
├── client/                         # React Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components (Knob, Buttons)
│   │   ├── pages/                  # Main Controller View
│   │   └── ...
├── server/                         # Node.js Backend
│   ├── index.ts                    # Express + WebSocket Server
│   └── ...
├── wing-studio-monitor-controller/ # Core Logic Library
│   ├── src/
│   │   ├── index.ts                # Main Controller Class
│   │   └── types.ts                # TypeScript Interfaces
│   └── package.json
├── config.ts                       # Main Configuration File
└── package.json                    # Root configuration
```

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   Behringer Wing Console (connected to network)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/wing-monitor-controller.git
    cd wing-monitor-controller
    ```

2.  Install dependencies:
    ```bash
    npm install
    # Or using pnpm
    pnpm install
    ```

3.  **Configuration**:
    Open `config.ts` in the root directory and update the settings:
    ```typescript
    export const config: WingMonitorConfig = {
      network: {
        ipAddress: '192.168.1.70', // Your WING's IP
        wingPort: 10024,
        localPort: 9000,
        retryAttempts: 3,       // Optional: Retries for failed commands
        retryDelay: 100,        // Optional: Delay in ms between retries
      },
      // ... Define your inputs and outputs here
    };
    ```

### Running Development Mode

Start both the frontend and backend in development mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Mock Mode (No Hardware Required)

To test the UI without a physical console, set `MOCK_MODE = true` in `config.ts`.

## Library Usage

The core logic is available as a standalone library in `wing-studio-monitor-controller`. You can use it in other projects (e.g., a mobile app).

```typescript
import { WingMonitorController } from './wing-studio-monitor-controller';
import { config } from '../config';

const controller = new WingMonitorController(config);

controller.connect();
controller.setVolume(80); // Set volume to 80%
```

## License

MIT
