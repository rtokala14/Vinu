import 'expo-router/entry';

import TrackPlayer from 'react-native-track-player';

import { PlaybackService } from './lib/player/service';

TrackPlayer.registerPlaybackService(() => PlaybackService);
