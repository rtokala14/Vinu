# Vinu

A full-featured [Audiobookshelf](https://www.audiobookshelf.org/) client for Android, built with Expo and React Native.

## Features

- **Streaming audio player** — background playback with lock-screen / notification controls, powered by react-native-track-player
  - Chapter-aware full-screen player: scrub bar, chapter navigation, configurable jump intervals
  - Playback speed (0.75×–2×) and sleep timer (fixed durations or end-of-chapter)
  - Mini player docked above the tab bar
  - Listening progress synced to the server every 15 s (and on pause/seek), resilient to being offline
  - Multi-file audiobooks handled with a single continuous timeline
- **Home** — personalized shelves from your server (Continue Listening, Continue Series, Recently Added, Discover, Listen Again) with a library switcher
- **Library** — browse Books, Series, Authors, Collections and Playlists with infinite scrolling
- **Detail pages** — book/podcast, author, and series screens with progress, chapters, episodes, descriptions, and mark-finished
- **Search** — books, series, and authors, all tappable through to their detail pages
- **Stats** — listening dashboard: today / total / streak tiles, last-7-days chart, most-listened, recent sessions
- **Settings** — theme, default playback speed, jump intervals, library selection

## Stack

- [Expo 53](https://expo.dev) + React Native 0.79, [expo-router](https://docs.expo.dev/router/introduction/) file-based navigation
- [NativeWind](https://www.nativewind.dev/) (Tailwind) with shadcn-style primitives (`components/ui`)
- [TanStack Query](https://tanstack.com/query) + an [orval](https://orval.dev/)-generated API client from the Audiobookshelf OpenAPI spec (`api/`)
- [Legend-State](https://legendapp.com/open-source/state/) with MMKV persistence for app state
- [react-native-track-player](https://rntp.dev/) for audio

## Development

```sh
bun install
bun run android   # builds the dev client (native build required — RNTP is a native module, Expo Go won't work)
bun start         # metro for an already-installed dev client
```

APK builds happen in CI (`.github/workflows/release.yml`) on `v*` tags or manual dispatch, via `expo prebuild` + Gradle. EAS profiles are configured in `eas.json` as well.

### Notes

- `newArchEnabled` is `false` in `app.json`: react-native-track-player 4.1 is most reliable on the old architecture. Flip it back on once RNTP ships first-class new-arch support, and re-test playback.
- After pulling changes that add native modules, rebuild the dev client (`bun run android`), a metro reload is not enough.
- The playback service is registered in `index.js`; the ABS session lifecycle (open / sync / close) lives in `lib/player/actions.ts`.
