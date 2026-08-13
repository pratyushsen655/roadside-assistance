/**
 * soundService.js — Incoming-request alert sound using expo-audio.
 *
 * Migrated from expo-av (removed/unsupported on Expo SDK 57) to expo-audio,
 * the official replacement. The API shape is different: createAudioPlayer()
 * is synchronous and returns a player object with settable .loop / .volume
 * properties and .play() / .pause() / .remove() methods, instead of
 * expo-av's async Audio.Sound.createAsync().
 *
 * The sound is an embedded base64 WAV, written to a cache file and played
 * from that file URI (more reliable across devices than a base64 data URI).
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateIncomingRequestWavBase64, getRawBase64String } from '../assets/soundData';
import * as FileSystem from 'expo-file-system/legacy';

let currentPlayer = null;
let cachedFileUri = null;

const VOLUME_MAP = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

async function getAudioFileUri() {
  if (cachedFileUri) return cachedFileUri;
  try {
    const fileUri = `${FileSystem.cacheDirectory}incoming_request.wav`;
    const base64Data = getRawBase64String();
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    cachedFileUri = fileUri;
    return cachedFileUri;
  } catch (err) {
    console.log('[soundService] Error creating cached wav file:', err.message);
    return null;
  }
}

export async function playIncomingRequestSound() {
  try {
    const storedPrefs = await AsyncStorage.getItem('mechanic_prefs');
    let prefs = null;
    if (storedPrefs) {
      try { prefs = JSON.parse(storedPrefs); } catch { prefs = null; }
    }
    if (prefs && prefs.soundEnabled === false) {
      console.log('[soundService] Sound disabled in settings. Skipping alert audio.');
      return;
    }
    const targetVolume = (prefs && prefs.alertVolume && VOLUME_MAP[prefs.alertVolume] !== undefined)
      ? VOLUME_MAP[prefs.alertVolume]
      : 1.0;

    await stopIncomingRequestSound();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
    } catch (modeErr) {
      console.log('[soundService] setAudioModeAsync note:', modeErr.message);
    }

    const fileUri = await getAudioFileUri();
    const source = fileUri ? { uri: fileUri } : { uri: generateIncomingRequestWavBase64() };

    console.log('[soundService] Loading alert sound...');
    const player = createAudioPlayer(source);
    player.loop = true;
    player.volume = targetVolume;
    player.play();

    currentPlayer = player;
    console.log('[soundService] Alert sound is playing (looping).');
  } catch (err) {
    console.log('[soundService] Failed to play request alert sound:', err.message);
  }
}

export async function stopIncomingRequestSound() {
  if (currentPlayer) {
    try {
      console.log('[soundService] Stopping alert sound...');
      currentPlayer.pause();
      currentPlayer.remove();
    } catch (err) {
      console.log('[soundService] Error stopping sound:', err.message);
    } finally {
      currentPlayer = null;
    }
  }
}
