import type { Coordinate } from "@/hooks/queries/indoorMapQueries";
import { Polygon } from "react-native-svg";
import { ROOM_STYLE } from "@/app/styles/roomPolygons/roomStyle";
import { SELECTED_ROOM_STYLE } from "@/app/styles/roomPolygons/selectedRoomStyle";

type Props = {
  polygon: Coordinate[];
  width: number;
  height: number;
  isSelected?: boolean;
  onPress?: () => void;
};

export default function RoomPolygon({
  polygon,
  width,
  height,
  isSelected,
  onPress,
}: Readonly<Props>) {
  if (polygon.length < 3) {
    return null;
  }

  const points = polygon
    .map((coord) => `${coord.x * width},${coord.y * height}`)
    .join(" ");

  const style = isSelected ? SELECTED_ROOM_STYLE : ROOM_STYLE;

  return (
    <Polygon
      points={points}
      fill={style.fillColor}
      stroke={style.strokeColor}
      strokeWidth={style.strokeWidth}
      onPress={onPress}
    />
  );
}
