import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../../config/firebase";

export interface UserProfile {
  userId: string;
  email: string;
  first_name: string;
  last_name: string;
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

export const createUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  const userProfile: UserProfile = {
    userId,
    email: profile.email || "",
    first_name: profile.first_name || "",
    last_name: profile.last_name || ""
  };

  await setDoc(doc(db, "users", userId), userProfile, { merge: true });
  return userId;
};

export const getUserProfile = async (userId: string) => {
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
};


// ===== Search History =====

export const addSearchHistory = async (userId: string, queryText: string, locations:string) => {
  const item: SearchHistoryItem = {
    query: queryText,
    locations,
    timestamp: new Date()
  };

  const docRef = await addDoc(collection(db, "users", userId, "searchHistory"), item);
  return docRef.id;
};

export const getSearchHistory = async (userId: string, maxResults: number = 50) => {
  const q = query(
    collection(db, "users", userId, "searchHistory"),
    orderBy("timestamp", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    searchId: docSnap.id,
    ...docSnap.data()
  })) as SearchHistoryItem[];
};

export const clearSearchHistory = async (userId: string) => {
  const snapshot = await getDocs(collection(db, "users", userId, "searchHistory"));
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
};

// ===== Schedule =====

export const addScheduleItem = async (userId: string, item: Omit<ScheduleItem, "scheduleId">) => {
  const docRef = await addDoc(collection(db, "users", userId, "schedule"), item);
  return docRef.id;
};

export const getUserSchedule = async (userId: string) => {
  const q = query(
    collection(db, "users", userId, "schedule"),
    orderBy("startTime", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    scheduleId: docSnap.id,
    ...docSnap.data()
  })) as ScheduleItem[];
};

export const updateScheduleItem = async (userId: string, scheduleId: string, updates: Partial<ScheduleItem>) => {
  await updateDoc(doc(db, "users", userId, "schedule", scheduleId), updates);
};

export const deleteScheduleItem = async (userId: string, scheduleId: string) => {
  await deleteDoc(doc(db, "users", userId, "schedule", scheduleId));
};

// ===== Saved Addresses =====

export const addSavedAddress = async (userId: string, address: Omit<SavedAddress, "addressId" | "createdAt">) => {
  const savedAddress: Omit<SavedAddress, "addressId"> = {
    ...address
  };

  const docRef = await addDoc(collection(db, "users", userId, "savedAddresses"), savedAddress);
  return docRef.id;
};

export const getSavedAddresses = async (userId: string, favoritesOnly: boolean = false) => {
  const baseCollection = collection(db, "users", userId, "savedAddresses");

  const q = favoritesOnly
    ? query(baseCollection, where("isFavorite", "==", true), orderBy("createdAt", "desc"))
    : query(baseCollection, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    addressId: docSnap.id,
    ...docSnap.data()
  })) as SavedAddress[];
};

export const updateSavedAddress = async (userId: string, addressId: string, updates: Partial<SavedAddress>) => {
  await updateDoc(doc(db, "users", userId, "savedAddresses", addressId), updates);
};

export const deleteSavedAddress = async (userId: string, addressId: string) => {
  await deleteDoc(doc(db, "users", userId, "savedAddresses", addressId));
};
