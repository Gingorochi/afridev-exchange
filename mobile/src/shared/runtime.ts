import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Vrai dans l'application Expo Go (tests rapides sur téléphone) : les modules natifs
 * propres au projet (MMKV, compresseur, SQLite PowerSync) n'y existent pas, on bascule
 * alors sur des équivalents inclus dans Expo Go. Faux dans un development build et en production.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const isWeb = Platform.OS === 'web';
