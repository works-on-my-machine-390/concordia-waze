import { COLORS } from "./constants";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

// Standard defaults
const DEFAULT_ICON_SIZE = 35;
const DEFAULT_ICON_COLOR = COLORS.textPrimary;

// Account icon
export function AccountIcon(size: number = DEFAULT_ICON_SIZE, color: string = DEFAULT_ICON_COLOR) {
  return <MaterialCommunityIcons name="account" size={size} color={color} />;
}

// No account icon
export function NoAccountIcon(size: number = DEFAULT_ICON_SIZE, color: string = DEFAULT_ICON_COLOR) {
  return <MaterialIcons name="no-accounts" size={size} color={color} />;
}

// Eye icon (for showing)
export function EyeShowingIcon(size: number = DEFAULT_ICON_SIZE, color: string = DEFAULT_ICON_COLOR) {
  return <MaterialCommunityIcons name="eye" size={size} color={color} />;
}

// Closed eye icon (for hiding)
export function EyeHidingIcon(size: number = DEFAULT_ICON_SIZE, color: string = DEFAULT_ICON_COLOR) {
  return <MaterialCommunityIcons name="eye-off" size={size} color={color} />;
}

// Go Back icon
export function BackIcon(size: number = DEFAULT_ICON_SIZE, color: string = DEFAULT_ICON_COLOR) {
  return <Ionicons name="arrow-back" size={size} color="color" />;
}