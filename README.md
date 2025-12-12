# Wing Studio Monitor Controller

A web application to control a Behringer Wing rack console as a studio monitor controller.

## Project Structure

This project is a monorepo managed by Nx.

- `apps/web-client`: React frontend application
- `apps/api`: Node.js backend application
- `libs/wing-controller`: Core logic library for OSC communication
- `libs/shared-models`: Shared TypeScript interfaces

## Instructions for AI Agents (Copilot, etc.)

When working on this codebase, please adhere to the following guidelines:

1.  **Monorepo Structure**: Respect the Nx monorepo structure. Code should be organized into `apps` and `libs`.
    -   Application-specific code goes into `apps/`.
    -   Reusable logic and models go into `libs/`.
2.  **TypeScript**: All code must be written in TypeScript with strict type safety. Avoid `any` types.
3.  **Testing**:
    -   Ensure all new features and bug fixes are covered by unit tests using Jest.
    -   Run tests using `pnpm nx test <project-name>`.
4.  **Styling**:
    -   The frontend uses Tailwind CSS.
    -   Follow the existing Neomorphic design style.
5.  **State Management**:
    -   The frontend uses React Context and Hooks for state management.
    -   WebSocket communication is central to the app's functionality.
6.  **Commit Messages**: Use clear and descriptive commit messages.

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm nx serve web-client
pnpm nx serve api
```

### Run Tests

```bash
pnpm nx run-many --target=test --all
```

### Build

```bash
pnpm nx run-many --target=build --all
```
