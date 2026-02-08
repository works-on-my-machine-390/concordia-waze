import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';
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
export const AccountIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialCommunityIcons name="account" size={size} color={color} />;

// No account icon
export const NoAccountIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="no-accounts" size={size} color={color} />;

// Eye icon (for showing)
export const EyeShowingIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialCommunityIcons name="eye" size={size} color={color} />;

// Closed eye icon (for hiding)
export const EyeHidingIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialCommunityIcons name="eye-off" size={size} color={color} />;

// Go Back icon
export const BackIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <Ionicons name="arrow-back" size={size} color={color} />;

// Logout icon
export const LogoutIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="logout" size={size} color={color} />;

// Login icon
export const LoginIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="login" size={size} color={color} />;


// Wheelchair icon
export const WheelchairIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <FontAwesome5 name="wheelchair" size={size} color={color} />
);

// Elevator icon
export const ElevatorIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="elevator" size={size} color={color} />
);

// Escalator icon
export const EscalatorIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="escalator" size={size} color={color} />
);

// Favorite (empty) icon
export const FavoriteEmptyIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="favorite-border" size={size} color={color} />
);

// Favorite (filled) icon
export const FavoriteFilledIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="favorite" size={size} color={color} />
);

// Close icon
export const CloseIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <AntDesign name="close" size={size} color={color} />
);

// Get directions icon
export const GetDirectionsIcon: React.FC<IconProps> = ({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => (
  <MaterialIcons name="directions" size={size} color={color} />
);