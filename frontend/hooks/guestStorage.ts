import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SavedAddress,
  ScheduleItem,
  SearchHistoryItem,
  UserProfile
} from "./firebase/useFirestore";

const STORAGE_PREFIX = "guest";

const buildKey = (suffix: string) => `${STORAGE_PREFIX}:${suffix}`;

const readList = async <T>(key: string): Promise<T[]> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

const writeList = async <T>(key: string, items: T[]): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(items));
};

export const getGuestProfile = async (): Promise<UserProfile | null> => {
  const raw = await AsyncStorage.getItem(buildKey("profile"));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
};

export const setGuestProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(buildKey("profile"), JSON.stringify(profile));
};

export const addGuestSearchHistory = async (item: SearchHistoryItem): Promise<void> => {
  const key = buildKey("searchHistory");
  const items = await readList<SearchHistoryItem>(key);
  items.unshift(item);
  await writeList(key, items);
};

export const getGuestSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  return readList<SearchHistoryItem>(buildKey("searchHistory"));
};

export const clearGuestSearchHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(buildKey("searchHistory"));
};

export const addGuestScheduleItem = async (item: ScheduleItem): Promise<void> => {
  const key = buildKey("schedule");
  const items = await readList<ScheduleItem>(key);
  items.push(item);
  await writeList(key, items);
};

export const getGuestSchedule = async (): Promise<ScheduleItem[]> => {
  return readList<ScheduleItem>(buildKey("schedule"));
};

export const setGuestSchedule = async (items: ScheduleItem[]): Promise<void> => {
  await writeList(buildKey("schedule"), items);
};

export const addGuestSavedAddress = async (item: SavedAddress): Promise<void> => {
  const key = buildKey("savedAddresses");
  const items = await readList<SavedAddress>(key);
  items.unshift(item);
  await writeList(key, items);
};

export const getGuestSavedAddresses = async (): Promise<SavedAddress[]> => {
  return readList<SavedAddress>(buildKey("savedAddresses"));
};

export const setGuestSavedAddresses = async (items: SavedAddress[]): Promise<void> => {
  await writeList(buildKey("savedAddresses"), items);
};

export const clearGuestData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    buildKey("profile"),
    buildKey("searchHistory"),
    buildKey("schedule"),
    buildKey("savedAddresses")
  ]);
};
