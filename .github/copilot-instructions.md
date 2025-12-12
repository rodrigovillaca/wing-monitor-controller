# GitHub Copilot Instructions for Wing Studio Monitor Controller

This document provides context and guidelines for GitHub Copilot to generate high-quality, project-aligned code for the Wing Studio Monitor Controller.

## 1. Project Overview & Architecture

*   **Type**: Nx Monorepo
*   **Goal**: Web-based monitor controller for Behringer Wing console via OSC.
*   **Structure**:
    *   `apps/web-client`: React 18 + Vite frontend.
    *   `apps/api`: Node.js + Express + WebSocket backend.
    *   `libs/wing-controller`: Core logic for OSC communication (Behringer Wing specific).
    *   `libs/shared-models`: Shared TypeScript interfaces and types (DTOs).

## 2. Technology Stack

*   **Language**: TypeScript (Strict mode enabled).
*   **Frontend**: React 18, Vite, Wouter (routing), Tailwind CSS (v4).
*   **Backend**: Node.js, Express, `ws` (WebSocket), `node-osc`.
*   **Testing**: Jest, React Testing Library.
*   **Package Manager**: pnpm.

## 3. Coding Standards & Best Practices

### TypeScript
*   **Strict Typing**: Never use `any`. Define interfaces in `libs/shared-models` if shared, or locally if private.
*   **Explicit Returns**: Always specify return types for functions, especially API handlers and hooks.
*   **Enums vs Unions**: Prefer string union types over Enums for better serialization.

### React (Frontend)
*   **Components**: Use Functional Components with Hooks.
*   **State**: Use `useContext` for global state (e.g., `WingContext`) and `useState`/`useReducer` for local state.
*   **Styling**: Use Tailwind CSS.
    *   **Neomorphism**: This project uses a specific Neomorphic design language.
    *   Use `shadow-neu-pressed` for active states.
    *   Use `shadow-neu-flat` for static elements.
    *   Use `bg-background` (defined in `index.css`) as the base color.
*   **Performance**: Memoize expensive calculations with `useMemo` and callbacks with `useCallback`.

### Node.js (Backend)
*   **Async/Await**: Use `async/await` for asynchronous operations.
*   **WebSockets**:
    *   Use typed messages defined in `libs/shared-models`.
    *   Always handle connection errors and disconnections gracefully.
*   **OSC**:
    *   Encapsulate OSC logic within `libs/wing-controller`.
    *   Do not leak OSC library details to the API layer; use the abstraction.

### Testing
*   **Framework**: Jest.
*   **Requirement**: Every new component or logic function MUST have a corresponding `.spec.ts` or `.spec.tsx` file.
*   **Pattern**:
    *   **Unit**: Test individual functions and components in isolation.
    *   **Integration**: Test the interaction between the API and the Wing Controller library.

## 4. Specific Patterns & Examples

### Shared Models
When defining a new message type for WebSocket communication, add it to `libs/shared-models/src/lib/shared-models.ts`:

```typescript
// Example
export interface MonitorState {
  mainVolume: number; // 0.0 to 1.0
  mute: boolean;
  dim: boolean;
  source: 'AES50-A' | 'USB' | 'LOCAL';
}
```

### Neomorphic Button Component
When generating UI components, follow this style:

```tsx
// Example of Neomorphic style
<button className="h-16 w-16 rounded-full bg-background shadow-neu-flat active:shadow-neu-pressed transition-all duration-200">
  <Icon />
</button>
```

### OSC Command Construction
When adding new Wing commands in `libs/wing-controller`:

```typescript
// Example
public setMainVolume(level: number): void {
  // Level must be float 0.0 - 1.0
  this.sendOSC('/main/st/mix/fader', level);
}
```

## 5. Workflow Guidelines

*   **File Creation**: When asked to create a file, always check if it belongs in `apps/` or `libs/`.
*   **Refactoring**: When refactoring, ensure no regression in existing tests.
*   **Comments**: Add JSDoc comments for public methods in libraries.
