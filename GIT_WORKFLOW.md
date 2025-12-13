# Git Workflow & Troubleshooting

This document outlines the standard git workflow for this project and how to resolve common authentication issues.

## Authentication

The project uses the GitHub CLI (`gh`) for authentication. If you encounter `fatal: invalid credentials` or `Unable to locate credentials` errors, follow these steps:

1.  **Check Authentication Status**:
    ```bash
    gh auth status
    ```
    Ensure you are logged in to `github.com`.

2.  **Configure Git Credential Helper**:
    Run this command to tell git to use the GitHub CLI as its credential helper:
    ```bash
    git config --global credential.helper '!gh auth git-credential'
    ```

3.  **Verify Remote URL**:
    Ensure the remote URL is using HTTPS (which works best with `gh` auth):
    ```bash
    git remote set-url origin https://github.com/rodrigovillaca/wing-monitor-controller.git
    ```

## Standard Workflow

1.  **Pull Latest Changes**:
    Always pull before starting work to avoid conflicts.
    ```bash
    git pull
    ```

2.  **Stage Changes**:
    ```bash
    git add .
    ```

3.  **Commit**:
    Use descriptive commit messages following Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).
    ```bash
    git commit -m "feat: description of changes"
    ```

4.  **Push**:
    ```bash
    git push
    ```

## Troubleshooting

If `git push` fails with credential errors even after configuring the helper:

1.  **Force Re-authentication**:
    Sometimes the token needs a refresh.
    ```bash
    gh auth login
    ```

2.  **Check Global Config**:
    Ensure no other credential helpers are interfering.
    ```bash
    git config --global --list
    ```
