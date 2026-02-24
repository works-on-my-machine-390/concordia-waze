import { api } from "../api";

export interface UserProfile {
  userId: string;
  email: string;
  full_name: string;
}

export interface SearchHistoryItem {
  searchId?: string;
  locations: string;
  query: string;
  timestamp: Date;
}

export interface ScheduleItem {
  scheduleId?: string;
  name: string;
  building?: string;
  room?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  type: string;
}

export interface SavedAddress {
  addressId?: string;
  address: string;
}

// ===== User Profile =====

export const createUserProfile = async (
  userId: string,
  profile: Partial<UserProfile>,
) => {
  const userProfile: UserProfile = {
    userId,
    email: profile.email || "",
    full_name: profile.full_name || "",
  };

  await (await api()).post(userProfile, `/users/${userId}/profile`).json();
  return userId;
};

export const getUserProfile = async (userId: string) => {
  try {
    const profile = await (await api())
      .get(`/users/${userId}/profile`)
      .json<UserProfile>();
    return profile;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
};

// ===== Search History =====

export const addSearchHistory = async (
  userId: string,
  queryText: string,
  locations: string,
) => {
  const item = {
    query: queryText,
    locations,
    timestamp: new Date().toISOString(),
  };

  const response = await (await api())
    .post(item, `/users/${userId}/search-history`)
    .json<{ id: string }>();
  return response.id;
};

export const getSearchHistory = async (
  userId: string,
  maxResults: number = 50,
) => {
  const history = await (await api())
    .get(`/users/${userId}/search-history?limit=${maxResults}`)
    .json<SearchHistoryItem[]>();

  return history.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
};

export const clearSearchHistory = async (userId: string) => {
  await (await api()).delete(`/users/${userId}/search-history`).res();
};

// ===== Schedule =====

export const addScheduleItem = async (
  userId: string,
  item: Omit<ScheduleItem, "scheduleId">,
) => {
  const response = await (await api())
    .post(item, `/users/${userId}/schedule`)
    .json<{ id: string }>();
  return response.id;
};

export const getUserSchedule = async (userId: string) => {
  const schedule = await (await api())
    .get(`/users/${userId}/schedule`)
    .json<ScheduleItem[]>();
  return schedule;
};

export const updateScheduleItem = async (
  userId: string,
  scheduleId: string,
  updates: Partial<ScheduleItem>,
) => {
  await (await api())
    .put(updates, `/users/${userId}/schedule/${scheduleId}`)
    .res();
};

export const deleteScheduleItem = async (
  userId: string,
  scheduleId: string,
) => {
  await (await api()).delete(`/users/${userId}/schedule/${scheduleId}`).res();
};

// ===== Saved Addresses =====

export const addSavedAddress = async (
  userId: string,
  address: Omit<SavedAddress, "addressId">,
) => {
  const response = await (await api())
    .post(address, `/users/${userId}/savedAddresses`)
    .json<{ id: string }>();
  return response.id;
};

export const getSavedAddresses = async (userId: string) => {
  const addresses = await (await api())
    .get(`/users/${userId}/savedAddresses`)
    .json<SavedAddress[]>();
  return addresses;
};

export const updateSavedAddress = async (
  userId: string,
  addressId: string,
  updates: Partial<SavedAddress>,
) => {
  await (await api())
    .put(updates, `/users/${userId}/savedAddresses/${addressId}`)
    .res();
};

export const deleteSavedAddress = async (userId: string, addressId: string) => {
  await (await api())
    .delete(`/users/${userId}/savedAddresses/${addressId}`)
    .res();
};
