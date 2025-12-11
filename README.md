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
-   **Subwoofer Control**: Enable/disable subwoofer with automatic crossover application to main speakers.
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

3.  Configure your Wing IP:
    Edit `server/index.ts` or set environment variables:
    ```bash
    export WING_IP="192.168.1.70"
    export WING_PORT="10024"
    ```

### Running Development Mode

Start both the frontend and backend in development mode:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Mock Mode (No Hardware Required)

To test the UI without a physical console, enable Mock Mode:

```bash
export MOCK_MODE=true
npm run dev
```

## Library Usage

The core logic is available as a standalone library in `wing-studio-monitor-controller`. You can use it in other projects (e.g., a mobile app).

```typescript
import { WingMonitorController } from './wing-studio-monitor-controller';

const controller = new WingMonitorController({
  network: { ipAddress: '192.168.1.70' },
  monitorMain: { path: '/main/4' },
  // ... config
});

controller.connect();
controller.setVolume(80); // Set volume to 80%
```

## License

MIT
