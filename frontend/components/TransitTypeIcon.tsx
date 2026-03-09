import { COLORS } from "@/app/constants";
import { TransitType } from "@/hooks/queries/navigationQueries";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";

type Props = {
  transitType: TransitType;
  color?: string;
  size?: number;
};

export default function TransitTypeIcon(props: Readonly<Props>) {
  let iconName: ComponentProps<typeof MaterialIcons>["name"];

  switch (props.transitType) {
    case TransitType.BUS:
      iconName = "directions-bus";
      break;
    case TransitType.SUBWAY:
      iconName = "subway";
      break;
    case TransitType.TRAIN:
      iconName = "directions-train";
      break;
    case TransitType.TRAM:
      iconName = "tram";
      break;
    case TransitType.WALKING:
      iconName = "directions-walk";
      break;
    default:
      iconName = "directions-transit";
  }

  return (
    <MaterialIcons
      name={iconName}
      size={props.size}
      color={props.color || COLORS.textPrimary}
    />
  );
}
