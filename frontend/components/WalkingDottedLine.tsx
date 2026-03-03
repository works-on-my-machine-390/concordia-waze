import { View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

/**
 * component made with the help of gemini
 * used to render the dotted line for walking steps in outdoor navigation transit directions.
 */
export default function WalkingDottedLine({ height = 96, color = "#4285F4" }) {
  return (
    <View style={{ height, width: 20, alignItems: "center" }}>
      <Svg height="100%" width="100%">
        <Defs>
          <Pattern
            id="dotPattern"
            x="0"
            y="0"
            width="24" 
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="10" cy="6" r="3" fill={color} />
          </Pattern>
        </Defs>

        <Rect width="100%" height="100%" fill="url(#dotPattern)" />
      </Svg>
    </View>
  );
}
