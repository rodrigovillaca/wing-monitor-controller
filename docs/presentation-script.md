# Wing Monitor Controller - Architecture Presentation Script

## Slide 1: Introduction
"Hello everyone. Today I'll be walking you through the architecture of the Wing Monitor Controller, a web-based interface for controlling the Behringer Wing console's monitoring section."

## Slide 2: High-Level Architecture
"The system is built on a modern three-tier architecture:
1.  **Web Client**: A React-based frontend providing a responsive, neumorphic user interface.
2.  **Node.js API**: A backend server acting as the bridge between the web and the hardware.
3.  **Wing Console**: The physical mixing console that receives OSC commands."

## Slide 3: Communication Flow - User Action
"Let's trace a user action, such as adjusting the volume:
1.  The user rotates the volume knob in the browser.
2.  The **Web Client** sends a JSON command via WebSocket to the API (e.g., `SET_MAIN_VOLUME`).
3.  The **API** translates this into an Open Sound Control (OSC) message (e.g., `/ch/40/fdr`).
4.  This OSC message is sent over UDP to the **Wing Console**, which physically adjusts the fader."

## Slide 4: State Synchronization
"Crucially, the system maintains real-time synchronization:
- The API periodically sends an `/xremote` command to the console to keep the subscription alive.
- If someone changes a setting on the physical console, the console sends an OSC update to the API.
- The API immediately broadcasts this new state to all connected web clients via WebSocket.
- This ensures the UI always reflects the true state of the hardware, whether changes happen on the screen or on the desk."

## Slide 5: Network Resilience
"We've built in resilience at multiple levels:
- The frontend handles connection drops with visual feedback (Red/Green indicators).
- The backend manages the UDP connection lifecycle.
- A 'Mock Mode' allows development and testing without the physical hardware."

## Slide 6: Conclusion
"This architecture provides a robust, low-latency control solution that is decoupled from the specific hardware implementation details, allowing for easy extensibility and maintenance."
