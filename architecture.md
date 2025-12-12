# Architecture Overview

This project is structured as an Nx monorepo, separating concerns into distinct applications and libraries.

## High-Level Architecture

```mermaid
graph TD
    User[User / Browser] -->|HTTP/WS| WebClient[Web Client (React)]
    WebClient -->|WebSocket| API[API Server (Node/Express)]
    API -->|OSC| WingConsole[Behringer Wing Console]
    WingConsole -->|OSC| API
    
    subgraph "Nx Monorepo"
        WebClient
        API
        WingController[Wing Controller Lib]
        SharedModels[Shared Models Lib]
    end
    
    API --> WingController
    WebClient -.-> SharedModels
    API -.-> SharedModels
    WingController -.-> SharedModels
```

## Project Structure

- **apps/web-client**: React frontend application. Handles UI, state management, and WebSocket communication with the API.
- **apps/api**: Node.js/Express backend application. Handles WebSocket connections from clients, manages the `WingMonitorController`, and persists settings.
- **libs/wing-controller**: Core logic library. Encapsulates the OSC communication with the Behringer Wing console and maintains the internal state.
- **libs/shared-models**: Shared TypeScript interfaces and types used by all projects to ensure type safety across the stack.

## Data Flow

1.  **Initialization**:
    *   API starts and initializes `WingMonitorController`.
    *   `WingMonitorController` connects to Wing Console via OSC (UDP).
    *   API starts WebSocket server.

2.  **Client Connection**:
    *   Web Client connects to API via WebSocket.
    *   API sends current `MonitorState` to Client.

3.  **User Interaction**:
    *   User adjusts volume or toggles mute in Web Client.
    *   Web Client sends command (e.g., `SET_MAIN_LEVEL`) to API via WebSocket.
    *   API delegates command to `WingMonitorController`.
    *   `WingMonitorController` sends OSC message to Wing Console.

4.  **Console Update**:
    *   Wing Console state changes (e.g., fader moved physically).
    *   Console sends OSC message to `WingMonitorController`.
    *   `WingMonitorController` updates internal state and emits update event.
    *   API listens for updates and broadcasts new `MonitorState` to all connected Web Clients.
