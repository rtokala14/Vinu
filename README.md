# Vinu

A full-featured [Audiobookshelf](https://www.audiobookshelf.org/) client for Android, built with Expo and React Native.

## Features

- **Streaming audio player** — background playback with lock-screen / notification controls, powered by react-native-track-player
  - Chapter-aware full-screen player: scrub bar, chapter navigation, configurable jump intervals
  - Playback speed (0.75×–2×) and sleep timer (fixed durations or end-of-chapter)
  - Mini player docked above the tab bar
  - Listening progress synced to the server every 15 s (and on pause/seek), resilient to being offline
  - Multi-file audiobooks handled with a single continuous timeline
- **Downloads & offline** — download books for local playback; listening while offline is recorded to a local session ledger and synced back to the server (`/api/session/local-all`) when you're back online
- **Smart rewind** — resuming rewinds a little, scaled by how long you were away
- **Bookmarks** — one-tap bookmark capture in the player (and car mode), with rename/delete and jump-to-bookmark from the item page
- **Car mode** — glanceable full-screen player with oversized controls
- **Home** — personalized shelves from your server (Continue Listening, Continue Series, Recently Added, Discover, Listen Again) with a library switcher
- **Library** — browse Books, Series, Authors, Collections and Playlists with infinite scrolling
- **Detail pages** — book/podcast, author, and series screens with progress, chapters, episodes, descriptions, and mark-finished
- **Search** — books, series, and authors, all tappable through to their detail pages
- **Stats** — listening insights: goal ring with daily-goal setting, streaks, last-7-days chart, calendar heatmap, listening-clock (when you listen), projected finish dates for in-progress books, most-listened, recent sessions
- **Settings** — theme, default playback speed, jump intervals, smart rewind, daily goal, downloads manager, library selection

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

### Releases

APK builds happen in CI (`.github/workflows/release.yml`) via `expo prebuild` + Gradle, and run on pushes to `master`, on `v*` tags, and on manual dispatch. EAS profiles are configured in `eas.json` as well.

The release tag is derived from `expo.version` in `app.json`. A build publishes a GitHub Release with the APK attached when that tag doesn't exist yet — so **bumping `expo.version` is what cuts a new downloadable release**; pushes that don't change the version still build and upload a workflow artifact, they just don't publish. Bump `android.versionCode` alongside the version so Android installs the new APK as an update over the old one.

### Notes

- `react-native-track-player` 4.1.2 is patched via bun `patchedDependencies` (`patches/react-native-track-player@4.1.2.patch`): its Kotlin `@ReactMethod`s were single-expression `scope.launch` calls returning `kotlinx.coroutines.Job`, which the New Architecture's interop layer cannot parse (`TurboModuleInteropUtils$ParsingException` → crash on first module access). The patch routes them through a `Unit`-returning wrapper. Remove the patch when RNTP ships New-Architecture support (5.x).
- `newArchEnabled` is `true` in `app.json` (the Expo SDK 53 default) and must stay that way: `react-native-mmkv` 3.x is New-Architecture-only — it relies on codegen to generate `NativeMmkvPlatformContextSpec`, so an old-architecture build fails to compile. `react-native-track-player` 4.1 has no codegen config and runs as a legacy module through the interop layer. If RNTP ever misbehaves on the new architecture, downgrade MMKV to 2.x rather than flipping this flag.
- After pulling changes that add native modules, rebuild the dev client (`bun run android`), a metro reload is not enough.
- The playback service is registered in `index.js`; the ABS session lifecycle (open / sync / close) lives in `lib/player/actions.ts`.
