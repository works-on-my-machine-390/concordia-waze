import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { COLORS } from "./constants";

// Standard defaults
const DEFAULT_ICON_SIZE = 35;
const DEFAULT_ICON_COLOR = COLORS.textPrimary;

interface IconProps {
  size?: number;
  color?: string;
}

// Account icon
export const AccountIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialCommunityIcons name="account" size={size} color={color} />
);

// No account icon
export const NoAccountIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="no-accounts" size={size} color={color} />
);

// Eye icon (for showing)
export const EyeShowingIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialCommunityIcons name="eye" size={size} color={color} />
);

// Closed eye icon (for hiding)
export const EyeHidingIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialCommunityIcons name="eye-off" size={size} color={color} />
);

// Go Back icon
export const BackIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <Ionicons name="arrow-back" size={size} color={color} />
);
