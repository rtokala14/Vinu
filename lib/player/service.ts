import TrackPlayer, { Event } from 'react-native-track-player';

import {
  handleActiveTrackChanged,
  handlePlaybackState,
  handleProgress,
  handleQueueEnded,
  handleRemoteDuck,
  handleRemoteSeek,
  jumpBackward,
  jumpForward,
  syncNow,
} from './actions';

/**
 * RNTP playback service — registered once in index.js. Runs for the lifetime
 * of the player and wires remote-control / playback events to the player
 * actions (which keep player$ and the ABS session in sync).
 */
export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
    void syncNow();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    void jumpForward();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    void jumpBackward();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    void handleRemoteSeek(event.position);
  });

  // Audio focus (phone calls, other media apps, headphones unplugged).
  TrackPlayer.addEventListener(Event.RemoteDuck, (event) => {
    void handleRemoteDuck(event);
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    handlePlaybackState(event.state);
  });

  // Fires ~1/s while playing: global position bookkeeping + periodic sync
  // is driven from here (see actions.ts).
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
    handleProgress(event);
  });

  // Multi-file books auto-advancing to the next file.
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    void handleActiveTrackChanged(event.index);
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    handleQueueEnded();
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.warn('Playback error:', event.code, event.message);
  });
}
