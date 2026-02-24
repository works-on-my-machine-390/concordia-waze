import CustomDrawer from "@/components/CustomDrawer";
import { Drawer } from "expo-router/drawer";
import { COLORS } from "../constants";
import { CalendarIcon, DirectoryIcon, FavoritesIcon, MapIcon } from "../icons";

const MapDrawerIcon = ({ color, size }: { color: string; size: number }) => (
  <MapIcon color={color} size={size} />
);

const DirectoryDrawerIcon = ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => <DirectoryIcon color={color} size={size} />;

const FavoritesDrawerIcon = ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => <FavoritesIcon color={color} size={size} />;

const ScheduleDrawerIcon = ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => <CalendarIcon color={color} size={size} />;

export default function DrawerLayout() {
  const getDrawerScreenOptions = (label: string) => ({
    headerShown: false,
    drawerLabel: label,
    title: label,
  });

  return (
    <Drawer
      drawerContent={CustomDrawer}
      screenOptions={{
        headerShown: false,

        drawerActiveTintColor: COLORS.textPrimary, // Text/Icon color when selected
        drawerActiveBackgroundColor: COLORS.conuRedLight, // Background color when selected

        drawerInactiveTintColor: "#333",
        drawerInactiveBackgroundColor: "transparent",
        drawerItemStyle: { marginVertical: 4, borderRadius: 16 },
        drawerLabelStyle: {
          fontSize: 16,
        },
      }}
    >
      <Drawer.Screen
        name="map"
        options={{
          ...getDrawerScreenOptions("Campus Map"),
          drawerIcon: MapDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="directory"
        options={{
          ...getDrawerScreenOptions("Directory"),
          drawerIcon: DirectoryDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="favorites"
        options={{
          ...getDrawerScreenOptions("Favorite Locations"),
          drawerIcon: FavoritesDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="schedule"
        options={{
          ...getDrawerScreenOptions("Schedule"),
          drawerIcon: ScheduleDrawerIcon,
        }}
      />
    </Drawer>
  );
}
