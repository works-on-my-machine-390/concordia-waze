import { useQueryClient } from "@tanstack/react-query";
import { useNavigationStore } from "./useNavigationStore";
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

  const findAndSetStartLocation = async () => {
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
