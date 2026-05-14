import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoExtra = (Constants.expoConfig ?? Constants.manifest ?? ({} as any)).extra as
  | { apiUrl?: string; mongoApiUrl?: string }
  | undefined;

const configured = expoExtra?.apiUrl;
const configuredMongo = expoExtra?.mongoApiUrl;

/** URL do backend SQLite (AppSqlite — porta 3333) */
export const API_URL =
  configured || (Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333');

/** URL do backend MongoDB (FrontBack/Server — porta 3000) */
export const MONGO_API_URL =
  configuredMongo || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export default API_URL;
