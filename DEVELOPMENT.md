# Development Guide

This project is an Nx monorepo.

## Prerequisites

- Node.js 22.x
- pnpm

## Project Structure

- `apps/web-client`: React frontend
- `apps/api`: Node.js backend
- `libs/wing-controller`: Core logic
- `libs/shared-models`: Shared types

## Getting Started

1.  Install dependencies:
    ```bash
    pnpm install
    ```

2.  Start the development server (starts both frontend and backend):
    ```bash
    pnpm nx run-many -t serve
    ```
    Or individually:
    ```bash
    pnpm nx serve api
    pnpm nx serve web-client
    ```

3.  Open http://localhost:3000 (or the port shown in console).

## Building

To build all projects:
```bash
pnpm nx run-many -t build
```

To build a specific project:
```bash
pnpm nx build web-client
pnpm nx build api
```

## Testing

To run unit tests:
```bash
pnpm nx run-many -t test
```

## Dependency Management

- Add a dependency to a specific project:
    ```bash
    cd apps/web-client && pnpm add <package>
    ```
- Add a dev dependency to root:
    ```bash
    pnpm add -D <package>
    ```

## Architecture

See [architecture.md](./architecture.md) and [class-diagrams.md](./class-diagrams.md) for details.
