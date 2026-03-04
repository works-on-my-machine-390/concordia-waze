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
  
  // for h building, the first letter is the building code 
  // im hardcoding it bc its the only building with 1 letter
  if (fullRoomNumber.startsWith("H")) {
    building = "H";
    room = fullRoomNumber.substring(1);
  } 
  // for other buildings its the first 2 letters
  // so that if it's MBS2.185 for example, it's not gonna take MBS as building code
  else if (fullRoomNumber.length >= 2) {
    building = fullRoomNumber.substring(0, 2);
    room = fullRoomNumber.substring(2);
  }
  
  return {
    building,
    room,
  };
};

export const useGetRoomLocation = (fullRoomNumber: string) => {
  const { building, room } = parseRoomNumber(fullRoomNumber);
  
  return useQuery<RoomLocation>({
    queryKey: ["roomLocation", fullRoomNumber],
    queryFn: async () => {
      const apiClient = await api();
      
      const params = new URLSearchParams({
        building, 
        room,  
      });
      
      return apiClient
        .get(`/rooms/search?${params}`)
        .json<RoomLocation>();
    },
    enabled: !!building && !!room,
    staleTime: Infinity, 
  });
};