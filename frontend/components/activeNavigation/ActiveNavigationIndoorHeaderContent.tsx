import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import {
  buildIndoorNavigationSteps,
  type IndoorNavigationStep,
} from "@/app/utils/indoorNavigationSteps";
import { MultiFloorPathResult } from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { IndoorDirectionsBlockModel } from "@/hooks/queries/navigationQueries";
import {
  getDirectionsSequence,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function ActiveNavigationIndoorHeaderContent() {
  const navigationState = useNavigationStore();
  const [indoorDirectionsSteps, setIndoorDirectionsSteps] = useState<
    IndoorNavigationStep[]
  >([]);

  const params = useLocalSearchParams<IndoorMapPageParams>();
  const floorsQuery = useGetBuildingFloors(params.buildingCode);

  const sequence = getDirectionsSequence(
    navigationState.currentDirections.directionBlocks,
  );

  const isSolelyOutdoors =
    Object.keys(sequence).length === 1 && sequence[0] === "outdoor";

  const getCurrentBlock = (): IndoorDirectionsBlockModel => {
    if (isSolelyOutdoors) return null;

    // this works given that the sequence is composed of at most 3 blocks, with at most 1 outdoor block, and no consecutive indoor blocks.
    if (params.buildingCode === navigationState.startLocation.code) {
      return navigationState.currentDirections.directionBlocks.find(
        (block) => block.type === "indoor" && block.sequenceNumber === 0,
      ) as IndoorDirectionsBlockModel;
    } else if (params.buildingCode === navigationState.endLocation.code) {
      return navigationState.currentDirections.directionBlocks.find(
        (block) => block.type === "indoor" && block.sequenceNumber >= 1,
      ) as IndoorDirectionsBlockModel;
    }

    return null;
  };

  const indoorDirections: MultiFloorPathResult = getCurrentBlock()?.directions;

  const getIndoorNavigationSteps = async () => {
    const segments = indoorDirections?.segments ?? [];
    const floors = floorsQuery.data?.floors ?? [];
    const transitionType = indoorDirections?.transitionType;
    const totalDistance = indoorDirections?.totalDistance;

    return await buildIndoorNavigationSteps({
      segments,
      floors,
      transitionType,
      exactTotalDistanceMeters: totalDistance,
    });
  };

  /**
   * this useEffect runs getIndoorNavigationSteps and updates the setIndoorDirectionsSteps state whenever
   * the indoor directions or the floors data changes. 
   * there are a couple of guards to ensure that the UI doesn't crash.
   */
  useEffect(() => {
    if (floorsQuery.isLoading || !indoorDirections || !floorsQuery.data) {
      setIndoorDirectionsSteps([]);
      return;
    }

    void getIndoorNavigationSteps()
      .then(setIndoorDirectionsSteps)
      .catch(() => {
        // Keep UI stable if step generation fails while data is updating.
        setIndoorDirectionsSteps([]);
      });
  }, [floorsQuery.isLoading, floorsQuery.data, indoorDirections]);


  return <></>;
}
