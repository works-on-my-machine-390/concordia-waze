import { CampusCode } from "@/hooks/queries/buildingQueries";
import * as Location from "expo-location";
import { LocationObject } from "expo-location";
import { CAMPUS_COORDS } from "../constants";
import { RoomSearchResponseModel } from "@/hooks/queries/roomQueries";
import { Toast } from "toastify-react-native";
import {
  IndoorNavigableLocation,
  OutdoorNavigableLocation,
} from "@/hooks/useNavigationStore";

// Haversine formula
export function getDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
) {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceInMeters(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
) {
  return getDistance(point1, point2) * 1000;
}

/**
 * Given two locations (latitude and longitude), determine if they are on different campuses.
 * This is done by calculating the distance of each location to the known coordinates of each campus.
 * If one location is closer to SGW and the other is closer to LOY, we can infer that the path between them is cross-campus.
 * @param startLocation
 * @param endLocation
 */
export function getIsCrossCampus(
  startLocation: { latitude: number; longitude: number },
  endLocation: { latitude: number; longitude: number },
) {
  if (!startLocation || !endLocation) return false;
  if (!startLocation.latitude || !startLocation.longitude) return false;
  if (!endLocation.latitude || !endLocation.longitude) return false;

  const startDistanceFromSGW = getDistance(
    startLocation,
    CAMPUS_COORDS[CampusCode.SGW],
  );
  const startDistanceFromLOY = getDistance(
    startLocation,
    CAMPUS_COORDS[CampusCode.LOY],
  );
  const endDistanceFromSGW = getDistance(
    endLocation,
    CAMPUS_COORDS[CampusCode.SGW],
  );
  const endDistanceFromLOY = getDistance(
    endLocation,
    CAMPUS_COORDS[CampusCode.LOY],
  );

  // If start is closer to SGW and end is closer to LOY, or vice versa, it's cross-campus
  return (
    (startDistanceFromSGW < startDistanceFromLOY &&
      endDistanceFromLOY < endDistanceFromSGW) ||
    (startDistanceFromLOY < startDistanceFromSGW &&
      endDistanceFromSGW < endDistanceFromLOY)
  );
}

export const getAddressFromLocation = async (location: LocationObject) => {
  if (location?.coords) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];

        // street adress
        const street = [addr.streetNumber, addr.street]
          .filter(Boolean)
          .join(" ");

        // adding city, region and postal code to it
        const formattedAddress = [
          street,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        return formattedAddress || "Current Location";
      }
    } catch (e) {
      console.error("Error reverse geocoding location:", e);
      return "Current Location";
    }
  }
  return "";
};

export const buildEndLocationFromSafeSearchResult = (
  res: RoomSearchResponseModel,
) => {
  if (res.fallback_to_building) {
    Toast.warn(
      "Room location data is not available, defaulting to building location.",
    );
    return {
      latitude: res.building_latitude,
      longitude: res.building_longitude,
      code: res.building_code,
      name: res.label,
    } as OutdoorNavigableLocation;
  }

  return {
    latitude: res.building_latitude,
    longitude: res.building_longitude,
    code: res.building_code,
    building: res.building_code,
    name: res.label,
    floor_number: res.room.floor,
    indoor_position: {
      x: res.room.centroid.x,
      y: res.room.centroid.y,
    },
  } as IndoorNavigableLocation;
};
