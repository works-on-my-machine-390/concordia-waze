export type DirectionIconProps = {
  size?: number;
  color?: string;
  maneuver: string;
};

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/**
 * Given a maneuver, returns the corresponding icon to be displayed in the step instructions.
 * @param props the maneuver for which to return the icon, as well as the size and color of the icon
 * @returns the icon corresponding to the maneuver
 */
export default function DirectionIcon(props: Readonly<DirectionIconProps>) {
  const renderIcon = () => {
    switch (props.maneuver) {
      case "turn-left":
      case "turn-right":
      case "turn-slight-left":
      case "turn-slight-right":
      case "turn-sharp-left":
      case "turn-sharp-right":
      case "fork-left":
      case "fork-right":
      case "ramp-left":
      case "ramp-right":
      case "roundabout-left":
      case "roundabout-right":
      case "straight":
        return (
          <MaterialIcons
            name={props.maneuver}
            size={props.size}
            color={props.color}
          />
        );
      case "merge":
        return (
          <MaterialCommunityIcons
            name="call-merge"
            size={props.size}
            color={props.color}
          />
        );

      case "uturn-left":
        return (
          <MaterialIcons
            name={"u-turn-left"}
            size={props.size}
            color={props.color}
          />
        );
      case "uturn-right":
        return (
          <MaterialIcons
            name={"u-turn-right"}
            size={props.size}
            color={props.color}
          />
        );
      default:
        return (
          <MaterialIcons
            name={"straight"}
            size={props.size}
            color={props.color}
          />
        );
    }
  };

  return renderIcon();
}
