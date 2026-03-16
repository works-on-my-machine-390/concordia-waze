import { IndoorMapPageParams } from "@/app/(drawer)/indoor-map";
import { DIRECTION_COLORS } from "@/app/constants";
import {
  createDottedPathPoints,
  orthogonalizePath,
  simplifyOrthogonalPath,
} from "@/app/utils/pathUtils";
import {
  DirectionsResponseBlockType,
  IndoorDirectionsBlockModel,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
  width: number;
  height: number;
  color?: string;
};

export default function IndoorPathOverlay(props: Readonly<Props>) {
  const navigationState = useNavigationStore();
  const params = useLocalSearchParams<IndoorMapPageParams>();

  // Find the current indoor segment (from the api's returned directions data) based on the selected floor and building
  const currentFloorSegment = useMemo(() => {
    const directionBlocks =
      navigationState.currentDirections?.directionBlocks ?? [];
    const indoorBlocks = directionBlocks.filter(
      (block): block is IndoorDirectionsBlockModel =>
        block.type === DirectionsResponseBlockType.INDOOR,
    );
    const floorNumber = Number(params.selectedFloor);

    if (!Number.isFinite(floorNumber)) return undefined;

    let currentIndoorBlock: IndoorDirectionsBlockModel | undefined;

    if (params.buildingCode === navigationState.startLocation?.code) {
      currentIndoorBlock = indoorBlocks[0];
    } else if (params.buildingCode === navigationState.endLocation?.code) {
      currentIndoorBlock = indoorBlocks.at(-1);
    }

    if (!currentIndoorBlock) return undefined;

    return currentIndoorBlock.directions.segments.find(
      (segment) => segment.floorNumber === floorNumber,
    );
  }, [
    navigationState.currentDirections?.directionBlocks,
    navigationState.endLocation?.code,
    navigationState.startLocation?.code,
    params.buildingCode,
    params.selectedFloor,
  ]);

  const pathColor = props.color ?? DIRECTION_COLORS.walking;
  const dotRadius = 2.5;

  const orthogonalPath = useMemo(() => {
    if (!currentFloorSegment || currentFloorSegment.path.length < 2) {
      return [];
    }

    const scaledPath = currentFloorSegment.path.map((point) => ({
      x: point.x * props.width,
      y: point.y * props.height,
    }));

    return simplifyOrthogonalPath(orthogonalizePath(scaledPath));
  }, [currentFloorSegment, props.height, props.width]);

  const dottedPoints = useMemo(
    () => createDottedPathPoints(orthogonalPath),
    [orthogonalPath],
  );

  const startPoint = orthogonalPath[0];
  const endPoint = orthogonalPath.at(-1);

  if (dottedPoints.length === 0 || !startPoint || !endPoint) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Svg width={props.width} height={props.height}>
        {dottedPoints.map((point, index) => (
          <Circle
            key={`indoor-path-dot-${index}-${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={dotRadius}
            fill={pathColor}
            testID="indoor-path-dot"
          />
        ))}
        <Circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={15}
          fill={pathColor}
          opacity={0.25}
          testID="indoor-path-start-halo"
        />
        <Circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={6}
          fill="#FFFFFF"
          stroke={pathColor}
          strokeWidth={3}
          testID="indoor-path-start"
        />
        <Circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={7}
          fill={pathColor}
          testID="indoor-path-start-core"
        />
        <Circle
          cx={endPoint.x}
          cy={endPoint.y}
          r={6}
          fill={pathColor}
          stroke="#FFFFFF"
          strokeWidth={2}
          testID="indoor-path-end"
        />
      </Svg>
    </View>
  );
}
