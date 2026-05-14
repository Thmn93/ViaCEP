import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoExtra = (Constants.expoConfig ?? Constants.manifest ?? ({} as any)).extra as
  | { apiUrl?: string }
  | undefined;

const configured = expoExtra?.apiUrl;

export const API_URL =
  configured || (Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333');

export default API_URL;
