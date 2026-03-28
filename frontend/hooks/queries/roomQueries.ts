import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type RoomLocation = {
  x: number;
  y: number;
  floor: number;
  building: string;
  room: string;
};

const parseRoomNumber = (fullRoomNumber: string) => {
  let building: string | null = null;
  let room: string | null = null;

  const fullRoomNumberUpper = fullRoomNumber.trim().toUpperCase();
  
  // for h building, the first letter is the building code 
  // im hardcoding it bc its the only building with 1 letter
  if (fullRoomNumberUpper.startsWith("H")) {
    building = "H";
    room = fullRoomNumberUpper.substring(1);
  } 
  // for other buildings its the first 2 letters
  // so that if it's MBS2.185 for example, it's not gonna take MBS as building code
  else if (fullRoomNumberUpper.length >= 2) {
    building = fullRoomNumberUpper.substring(0, 2);
    room = fullRoomNumberUpper.substring(2);
  }
  
  return {
    building,
    room,
  };
};

export type RoomSearchResponseModel = {
  label: string; // label to display while navigating, e.g. building code + room code if available, otherwise building code + building long name
  room?: {
   centroid: {
     x: number;
     y: number;
   },
    floor: number;
    geometryType: string;
  };
  building_code: string;
  building_latitude?: number;
  building_longitude?: number;
  fallback_to_building: boolean;
  reason?: string;
}

export const useGetRoomLocation = (fullRoomNumber: string) => {
  const { building, room } = parseRoomNumber(fullRoomNumber);
  
  return useQuery<RoomSearchResponseModel>({
    queryKey: ["room", "search", fullRoomNumber],
    queryFn: async () => {
      const apiClient = await api();
      
      const params = new URLSearchParams({
        building, 
        room,  
      });
      
      return apiClient
        .get(`/rooms/safesearch?${params}`)
        .json<RoomSearchResponseModel>();
    },
    enabled: !!building && !!room,
    staleTime: Infinity, 
  });
};