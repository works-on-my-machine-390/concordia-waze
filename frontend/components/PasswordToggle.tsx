import { TouchableOpacity } from "react-native";
import { EyeHidingIcon, EyeShowingIcon } from "../app/icons";
import { COLORS } from "../app/constants";

interface PasswordToggleProps {
  show: boolean;
  onPress: () => void;
}

export default function PasswordToggle({ show, onPress }: PasswordToggleProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      {show ? (
        <EyeHidingIcon size={24} color={COLORS.maroon} />
      ) : (
        <EyeShowingIcon size={24} color={COLORS.maroon} />
      )}
    </TouchableOpacity>
  );
}