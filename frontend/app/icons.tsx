import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Octicons from "@expo/vector-icons/Octicons";
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

// Map icon
export const MapIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="map" size={size} color={color} />;

// Directory icon
export const DirectoryIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => (
  <MaterialCommunityIcons
    name="book-open-page-variant"
    size={size}
    color={color}
  />
);

// Favorites icon
export const FavoritesIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="favorite" size={size} color={color} />;

// Calendar icon
export const CalendarIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="calendar-month" size={size} color={color} />;

// Login icon
export const LoginIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="login" size={size} color={color} />;

// Wheelchair icon
export const WheelchairIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <FontAwesome5 name="wheelchair" size={size} color={color} />;

// Elevator icon
export const ElevatorIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="elevator" size={size} color={color} />;

// Escalator icon
export const EscalatorIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="escalator" size={size} color={color} />;

// Favorite (empty) icon
export const FavoriteEmptyIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="favorite-border" size={size} color={color} />;

// Favorite (filled) icon
export const FavoriteFilledIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="favorite" size={size} color={color} />;

// Close icon
export const CloseIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <AntDesign name="close" size={size} color={color} />;

// Get directions icon
export const GetDirectionsIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="directions" size={size} color={color} />;

// Ramp icon
export const SlopeUpIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialCommunityIcons name="slope-uphill" size={size} color={color} />;

// Circle icon
export const CircleIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <Entypo name="circle" size={size} color={color} />;

// Location icon
export const LocationIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <Octicons name="location" size={size} color={color} />;

// walking icon
export const WalkingIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <FontAwesome5 name="walking" size={size} color={color} />;

// car icon
export const CarIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <AntDesign name="car" size={size} color={color} />;

// train icon
export const TrainIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <FontAwesome6 name="train-subway" size={size} color={color} />;

// bike icon
export const BikeIcon: React.FC<IconProps> = ({
  size = DEFAULT_ICON_SIZE,
  color = DEFAULT_ICON_COLOR,
}) => <MaterialIcons name="directions-bike" size={size} color={color} />;
