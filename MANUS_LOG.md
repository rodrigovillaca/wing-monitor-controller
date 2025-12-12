# Manus Work Log & Context

This document serves as a persistent memory for Manus instances working on the Wing Studio Monitor Controller project. It tracks major architectural decisions, current state, and known issues.

## Project Context

*   **Architecture**: Nx Monorepo
    *   `apps/web-client`: React 18 + Vite (Frontend)
    *   `apps/api`: Node.js + Express + WebSocket (Backend)
    *   `libs/wing-controller`: Core OSC logic (Library)
    *   `libs/shared-models`: Shared Types (Library)
*   **Design System**: Neomorphic UI (Tailwind CSS v4)
*   **Communication**: WebSocket (Frontend <-> Backend), OSC (Backend <-> Wing Console)

## Work Log

### [2025-12-11] - Project Restructuring & Cleanup
*   **Action**: Migrated to Nx Monorepo structure.
*   **Action**: Removed unused UI components from `apps/web-client` to clean up the codebase.
*   **Action**: Fixed `tsconfig.json` extends paths to correctly point to `../../tsconfig.base.json`.
*   **Action**: Verified build success for all projects (`web-client`, `api`, `shared-models`, `wing-controller`).
*   **Action**: Added `.github/copilot-instructions.md` to guide GitHub Copilot.

## Current State
*   The project builds successfully.
*   Unused Vite configurations have been removed from `libs/`.
*   The `_temp_backup` folder has been removed.

## Future Tasks
*   **Testing**: Ensure comprehensive unit test coverage for `wing-controller` logic.
*   **Mobile**: Plan for a mobile companion app (using the shared libraries).
*   **Features**: Implement specific monitor control features (Talkback, Mono, etc.) as requested.

## Instructions for Future Manus Instances
1.  **Always Pull First**: Start by pulling the latest changes from GitHub to ensure you have the most recent code from human developers.
2.  **Check this Log**: Read this file to understand the recent history and context.
3.  **Update this Log**: After completing significant work, append a new entry to the "Work Log" section.
4.  **Respect the Monorepo**: Keep logic in `libs/` whenever possible to facilitate code sharing.
