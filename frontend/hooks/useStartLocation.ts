import { useQueryClient } from "@tanstack/react-query";
import { NavigableLocation, useNavigationStore } from "./useNavigationStore";
import { Building } from "./queries/buildingQueries";
import { useMapStore } from "./useMapStore";
import { getAddressFromLocation } from "@/app/utils/mapUtils";

/**
 * Custom hook for logic related to getting the user's start location.
 * @returns An object containing the function to find and set the start location.
 */
export default function useStartLocation() {
  const setStartLocation = useNavigationStore(
    (state) => state.setStartLocation,
  );
  const { userLocation, currentBuildingCode } = useMapStore();
  const queryClient = useQueryClient();

  /**
   * Finds and sets the start location based on the user's current location.
   * @param endLocation - The end location for navigation. If provided, we can check if the user is already in the same building and set the start location accordingly.
   */
  const findAndSetStartLocation = async (endLocation?: NavigableLocation) => {
    const currentLocationDetails = queryClient.getQueryData<Building>([
      "buildingDetails",
      currentBuildingCode,
    ]);

    let startAddress = "";
    if (userLocation && !currentLocationDetails) {
      startAddress = await getAddressFromLocation(userLocation);
    }

    if (!currentLocationDetails && !userLocation) {
      setStartLocation(null);
      return;
    }

    if (
      endLocation &&
      endLocation.code &&
      endLocation.code === currentLocationDetails?.code
    ) {
      setStartLocation(null); // have user set manually since we can't be sure where they are in the building
      return;
    }

    setStartLocation({
      name: currentLocationDetails?.long_name || startAddress,
      latitude:
        currentLocationDetails?.latitude || userLocation?.coords.latitude,
      longitude:
        currentLocationDetails?.longitude || userLocation?.coords.longitude,
      code: currentLocationDetails?.code,
      address: currentLocationDetails?.address || startAddress,
    });
  };

  return { findAndSetStartLocation };
}
