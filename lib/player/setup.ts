import TrackPlayer, {
  AndroidAudioContentType,
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';

import { store$ } from '~/stores';

let setupPromise: Promise<void> | undefined;

/**
 * Lazily initializes the RNTP player exactly once. Safe to call repeatedly —
 * concurrent and subsequent calls share the same promise, and a "player has
 * already been initialized" error is swallowed (e.g. after a JS reload).
 */
export function ensurePlayerSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = doSetup().catch((err) => {
      // Allow a retry on genuine failures (e.g. setup attempted in background).
      setupPromise = undefined;
      throw err;
    });
  }
  return setupPromise;
}

async function doSetup(): Promise<void> {
  try {
    await TrackPlayer.setupPlayer({
      androidAudioContentType: AndroidAudioContentType.Speech,
      autoHandleInterruptions: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already been initialized/i.test(message)) {
      throw err;
    }
  }

  await TrackPlayer.updateOptions({
    android: {
      // Audiobooks should keep playing when the app is swiped away.
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      alwaysPauseOnInterruption: true,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.JumpForward,
      Capability.JumpBackward,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.JumpForward,
      Capability.JumpBackward,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.JumpForward,
      Capability.JumpBackward,
      Capability.SeekTo,
    ],
    forwardJumpInterval: store$.settings.jumpForwardSec.peek() || 30,
    backwardJumpInterval: store$.settings.jumpBackwardsSec.peek() || 30,
    // Drives Event.PlaybackProgressUpdated (fires while playing) — the player
    // service uses it for global position bookkeeping.
    progressUpdateEventInterval: 1,
  });
}
