# Class Diagrams

## WingMonitorController (libs/wing-controller)

This class encapsulates the core logic for interacting with the Behringer Wing console.

```mermaid
classDiagram
    class WingMonitorController {
        -config: WingMonitorConfig
        -udpPort: osc.UDPPort
        -state: MonitorState
        -logger: Logger
        +constructor(config: WingMonitorConfig)
        +connect(): Promise<void>
        +close(): void
        +getState(): MonitorState
        +setMainLevel(level: number): void
        +setMute(muted: boolean): void
        +setDim(dimmed: boolean): void
        +setMono(mono: boolean): void
        +setMonitorSource(index: number): void
        +toggleAuxSource(index: number): void
        +setOutputSource(index: number): void
        +setSubwoofer(enabled: boolean): void
        +setTalkback(enabled: boolean): void
        +setPolarity(flipped: boolean): void
        -setupOscListeners(): void
        -sendOsc(address: string, args: any[]): void
        -updateState(partialState: Partial<MonitorState>): void
    }

    class MonitorState {
        +mainLevel: number
        +isMuted: boolean
        +isDimmed: boolean
        +isMono: boolean
        +activeInputIndex: number
        +activeAuxIndices: number[]
        +activeOutputIndex: number
        +isSubwooferEnabled: boolean
        +isTalkbackEnabled: boolean
        +isPolarityFlipped: boolean
    }

    WingMonitorController --> MonitorState : manages
```

## API Server (apps/api)

The API server handles WebSocket connections and settings persistence.

```mermaid
classDiagram
    class APIServer {
        -wss: WebSocket.Server
        -controller: WingMonitorController
        -settings: SettingsManager
        +start(): void
        -handleConnection(ws: WebSocket): void
        -handleMessage(ws: WebSocket, message: any): void
        -broadcastState(state: MonitorState): void
    }

    class SettingsManager {
        -settingsPath: string
        -currentSettings: AppSettings
        +load(): Promise<AppSettings>
        +save(settings: AppSettings): Promise<void>
        +get(): AppSettings
    }

    APIServer --> WingMonitorController : uses
    APIServer --> SettingsManager : uses
```

## Web Client (apps/web-client)

The React frontend components.

```mermaid
classDiagram
    class App {
        +render(): JSX.Element
    }

    class MonitorControllerPage {
        -state: MonitorState
        -ws: WebSocket
        +useEffect(): void
        +handleVolumeChange(val: number): void
        +toggleMute(): void
        +render(): JSX.Element
    }

    class VolumeKnob {
        -value: number
        -onChange: (val: number) => void
        -displayUnit: 'percent' | 'db'
        +render(): JSX.Element
    }

    class SettingsModal {
        -isOpen: boolean
        -onClose: () => void
        -settings: AppSettings
        -onSave: (settings: AppSettings) => void
        +render(): JSX.Element
    }

    App --> MonitorControllerPage
    MonitorControllerPage --> VolumeKnob
    MonitorControllerPage --> SettingsModal
```
