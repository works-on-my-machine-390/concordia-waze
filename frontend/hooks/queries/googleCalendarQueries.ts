import { api } from "../api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ClassItem = {
  eventId?: string;
  classId?: string;
  type: string; // lab, lec, tut
  section: string;
  day: string;
  startTime: string;
  endTime: string;
  buildingCode?: string;
  room?: string;
  origin?: "manual" | "google";
};

export type CourseItem = {
  name: string;
  classes: ClassItem[];
};

export type SyncCoursesResponse = {
  events: CourseItem[];
  errors?: string[];
};

// Courses
export const getCourses = async (): Promise<CourseItem[]> => {
  const apiClient = await api();
  return apiClient.url("/courses").get().json<CourseItem[]>();
};

const formatDateYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type SyncCoursesOptions = {
  since?: string;
  calendarID?: string;
};

export const syncCourses = async (options?: SyncCoursesOptions): Promise<SyncCoursesResponse> => {
  const apiClient = await api();
  const sinceDateStr = options?.since || formatDateYYYYMMDD(new Date());
  const calendarID = options?.calendarID || "primary";
  const query = new URLSearchParams({
    since: sinceDateStr,
    calendar_id: calendarID,
  });
  return apiClient.url(`/courses/sync?${query.toString()}`).get().json<SyncCoursesResponse>();
};

export const addCourse = async (course: Partial<CourseItem>): Promise<CourseItem> => {
  const apiClient = await api();
  return apiClient.url("/courses").post(course).json<CourseItem>();
};

export const deleteCourse = async (name: string): Promise<{ success: boolean }> => {
  const apiClient = await api();
  return apiClient.url(`/courses/${encodeURIComponent(name)}`).delete().json<{ success: boolean }>();
};


// Class Items
export const addClassItem = async (courseName: string, classItem: Partial<ClassItem>): Promise<ClassItem> => {
  const apiClient = await api();
  return apiClient.url(`/courses/${encodeURIComponent(courseName)}/items`).post(classItem).json<ClassItem>();
};

export const updateClassItem = async (
  courseName: string,
  classID: string,
  classItem: Partial<ClassItem>
): Promise<ClassItem> => {
  const apiClient = await api();
  return apiClient
    .url(`/courses/${encodeURIComponent(courseName)}/items/${encodeURIComponent(classID)}`)
    .patch(classItem)
    .json<ClassItem>();
};

export const deleteClassItem = async (courseName: string, classID: string): Promise<{ success: boolean }> => {
  const apiClient = await api();
  return apiClient
    .url(`/courses/${encodeURIComponent(courseName)}/items/${encodeURIComponent(classID)}`)
    .delete()
    .json<{ success: boolean }>();
};


// --- React Query Hooks --- 

const COURSE_QUERY_KEY = ["courses"] as const;

// Courses
export const useCourses = () =>
  useQuery({
    queryKey: COURSE_QUERY_KEY,
    queryFn: getCourses,
  });

export const useSyncCourses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncCourses,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};

export const useAddCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};

// Class Items
export const useAddClassItem = (courseName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classItem: Partial<ClassItem>) => addClassItem(courseName, classItem),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};

export const useUpdateClassItem = (courseName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classID, classItem }: { classID: string; classItem: Partial<ClassItem> }) =>
      updateClassItem(courseName, classID, classItem),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};

export const useDeleteClassItem = (courseName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classID: string) => deleteClassItem(courseName, classID),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY }),
  });
};