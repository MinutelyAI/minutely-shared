# Minutely Shared

This package contains the shared UI primitives, API clients, and utilities used by both the `minutely-web` and `minutely-desktop` applications. It ensures consistent design tokens, styling, and backend communication across platforms.

## Purpose

- **UI Components**: Reusable components built with Radix UI, Base UI, and Tailwind CSS.
- **API Client**: A shared, platform-neutral API client that communicates with `minutely-api`.
- **Utilities**: Shared utility functions, such as `cn` for Tailwind class merging.
- **Design Tokens**: Standardized design tokens.

## Usage

This package is installed locally in the workspace using the `file:` protocol. 

To use it in other packages:
```json
"dependencies": {
  "@minutely/shared": "file:../minutely-shared"
}
```

## How to Install

If you make changes to `minutely-shared` and want them reflected in the dependent apps, you must run `pnpm install` in the respective application directories (`minutely-desktop` or `minutely-web`).

```bash
cd minutely-shared
pnpm install
```

## Build

Since this package is consumed directly from source (`src/index.ts`) by Vite/Electron builds in the consumer apps, there is no standalone build step required. The parent applications will transpile these `.ts` and `.tsx` files as part of their own build processes.