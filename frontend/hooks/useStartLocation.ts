import { useQueryClient } from "@tanstack/react-query";
import { ModifyingFieldOptions, NavigableLocation, useNavigationStore } from "./useNavigationStore";
import {
  Building,
  fetchBuildingDetails,
  getBuildingDetailsQueryKey,
} from "./queries/buildingQueries";
import { useMapStore } from "./useMapStore";
import { getAddressFromLocation } from "@/app/utils/mapUtils";
import { Toast } from "toastify-react-native";

/**
 * Custom hook for logic related to getting the user's start location.
 * @returns An object containing the function to find and set the start location.
 */
export default function useStartLocation() {
  const { setStartLocation, setModifyingField, modifyingField } =
    useNavigationStore();
  const { userLocation, currentBuildingCode } = useMapStore();
  const queryClient = useQueryClient();

  /**
   * Finds and sets the start location based on the user's current location.
   * @param endLocation - The end location for navigation. If provided, we can check if the user is already in the same building and set the start location accordingly.
   */
  const findAndSetStartLocation = async (endLocation?: NavigableLocation) => {
    const currentLocationDetails = queryClient.getQueryData<Building>(
      getBuildingDetailsQueryKey(currentBuildingCode),
    );

    const isUserInSameBuildingAsEndLocation =
      endLocation &&
      endLocation.code &&
      endLocation.code === currentLocationDetails?.code;

    const isUserLocationAvailable = !!userLocation;

    if (
      (!currentLocationDetails && !isUserLocationAvailable) ||
      isUserInSameBuildingAsEndLocation
    ) {
      setStartLocation(null); // prompt the user to set it themselves
      setModifyingField(ModifyingFieldOptions.start); // let the user's next click on a building or indoor POI set the start location.
      return;
    }

    let startAddress = "";
    if (userLocation && !currentLocationDetails) {
      startAddress = await getAddressFromLocation(userLocation);
    }

    setStartLocation({
      name: currentLocationDetails?.long_name || startAddress,
      latitude:
        currentLocationDetails?.latitude || userLocation?.coords.latitude,
      longitude:
        currentLocationDetails?.longitude || userLocation?.coords.longitude,
      code: currentLocationDetails?.code || "",
      address: currentLocationDetails?.address || startAddress,
    });
  };

  /**
   * provided a NavigableLocation, set it as the start location and reset modifying field.
   * guarded to only update if the user is currently trying to modify the start location.
   */
  const setStartLocationManually = (location: NavigableLocation) => {
    if (modifyingField === ModifyingFieldOptions.start) {
      setStartLocation(location);
      setModifyingField(null);
    }
  };

  /**
   * Given a building code, looks up the information using queryClient and sets the start location accordingly.
   * @param buildingCode the code of the building to set as the start location.
   */
  const setStartLocationAutocomplete = async (buildingCode: string) => {
    try {
      const buildingDetails = await queryClient.ensureQueryData<Building>({
        queryKey: getBuildingDetailsQueryKey(buildingCode),
        queryFn: () => fetchBuildingDetails(buildingCode),
      });

      setStartLocationManually({
        name: buildingDetails.long_name,
        latitude: buildingDetails.latitude,
        longitude: buildingDetails.longitude,
        code: buildingCode,
        address: buildingDetails.address,
      });
    } catch {
      // If lookup fails, keep manual start selection flow active.
      Toast.error("Failed to get information about the selected building, please try again.")
      setStartLocation(null);
      setModifyingField(ModifyingFieldOptions.start);
    }
  };

  return {
    findAndSetStartLocation,
    setStartLocationManually,
    setStartLocationAutocomplete,
  };
}
