import { api } from "../api";
import { TYPES } from "../../app/constants";
import { DAYS } from "../../app/utils/dateUtils";

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

export interface CourseItem {
  courseId?: string;
  name: string;
  classes: ClassItem[];
}

export interface ClassItem {
  classId?: string;
  type: (typeof TYPES)[number];
  section: string;
  day: (typeof DAYS)[number];
  startTime: string;
  endTime: string;
  buildingCode: string;
  room: string;
  origin: "manual" | "google";
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
// == Courses ==
export const createCourse = async (
  userId: string,
  title: string,
): Promise<void> => {
  await (await api())
    .post({}, `/users/${userId}/courses/${title}`)
    .res();
};

export const getUserCourses = async (userId: string): Promise<CourseItem[]> => {
  const courses = await (await api())
    .get(`/users/${userId}/courses`)
    .json<CourseItem[]>();
  return courses;
};

export const deleteCourse = async (
  userId: string,
  title: string,
): Promise<void> => {
  await (await api())
    .delete(`/users/${userId}/courses/${title}`)
    .res();
};

// == Classes ==
export const addClass = async (
  userId: string,
  title: string,
  item: Omit<ClassItem, "classId">,
): Promise<string> => {
  const response = await (await api())
    .post(item, `/users/${userId}/courses/${title}/classes`)
    .json<{ id: string }>();
  return response.id;
};

export const deleteClass = async (
  userId: string,
  title: string,
  classId: string,
): Promise<void> => {
  await (await api())
    .delete(`/users/${userId}/courses/${title}/classes/${classId}`)
    .res();
};

export const updateClass = async (
  userId: string,
  title: string,
  classId: string,
  updates: Partial<ClassItem>,
): Promise<void> => {
  await (await api())
    .put(updates, `/users/${userId}/courses/${title}/classes/${classId}`)
    .res();
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
