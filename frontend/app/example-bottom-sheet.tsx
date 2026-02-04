import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from "./constants";
import {
  CloseIcon,
  ElevatorIcon,
  EscalatorIcon,
  FavoriteEmptyIcon,
  GetDirectionsIcon,
  WheelchairIcon
} from "./icons";

// To list services and departments
function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}


export default function ExampleBottomSheet() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const snapPoints = useMemo(() => ['20%', '70%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  // Mock building because no building yet
  const mockBuilding = useMemo(
    () => ({
      name: 'John Molson Building',
      acronym: 'MB',
      address: '1450 Guy St, Montreal',
      services: [
        "Career Management Service",
        "First Stop",
        "John Molson Executive Centre",
        "Performing Arts Faciliting",
        "Zen Den",
      ],
      departments: [
        "Accountacy",
        "Contemporary Dance",
        "Executive MBA Program",
        "Finance",
        "Goodman Institute of Investment Management",
        "Mangement",
        "Marketing",
        "Music",
        "Supply Chain & Business Technology Management",
        "Theatre",
        "Accolknuntacy",
        "Contempivgorary Dance",
        "Executivekjb MBA Program",
        "Finankjbce",
        "Goodkjbman Institute of Investment Management",
        "Mangekjhbment",
        "Markekjbting",
        "Muskjbic",
        "Sujbpply Chain & Business Technology Management",
        "Theakjbtre",
        "fbvfdb",
        "vfbfdv",
        "vbefgbr",
        "vsvdfv",
        "vefrvgerfv",
        "fvefvefbv",
        "bfbegfb",
        "fvfbgbeD",
        "fbefbb",
      ],
      accessibility: {
        wheelchair: true,
        elevator: true,
        escalator: true,
      },
    }),
    []
  );

  // Accessibility icons to be shown for each bulding if they have them (wheelchair, elevator, escalator)
  const accessibilityIcons = useMemo(
    () =>
      [
        mockBuilding.accessibility.wheelchair && (
          <WheelchairIcon key="wheelchair" color="#0E4C92" size={24} />
        ),
        mockBuilding.accessibility.elevator && (
          <ElevatorIcon key="elevator" color="#0E4C92" size={30} />
        ),
        mockBuilding.accessibility.escalator && (
          <EscalatorIcon key="escalator" color="#0E4C92" size={30} />
        ),
      ].filter(Boolean),
    [mockBuilding.accessibility]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enableContentPanningGesture
        enableDynamicSizing={false}
        detached
        backgroundStyle={styles.bottomSheet}
        containerStyle={{ overflow: 'visible' }}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.floatingIcon}>
            <GetDirectionsIcon size={90} color={COLORS.maroon} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.name}>
              {mockBuilding.name} ({mockBuilding.acronym})
            </Text>
            <Text style={styles.address}>{mockBuilding.address}</Text>
          </View>

          <View style={styles.iconsContainer}>
            <View style={styles.acessibilityIconsContainer}>
              {accessibilityIcons}
            </View>

            <View style={styles.acessibilityIconsContainer}>
              <FavoriteEmptyIcon color={COLORS.maroon} />
              <CloseIcon size={28} />
            </View>
          </View>
        </View>

        {/* Scrollable Content (services and departments for now)*/}
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {sheetIndex > 0 && (
            <>
              <ListSection
                title="Services"
                items={mockBuilding.services}
              />
              <ListSection
                title="Departments"
                items={mockBuilding.departments}
              />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },

  bottomSheet: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  floatingIcon: {
    position: 'absolute',
    top: -60,
    right: 10,
    zIndex: 10,
    borderRadius: 20,
    padding: 6,
  },

  textContainer: {
    alignItems: "flex-start",
    justifyContent: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.textPrimary,
  },

  address: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.textSecondary,
  },

  iconsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  acessibilityIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  listContainer: {
    marginBottom: 20,
    backgroundColor: '#f2f2f2',
    padding: 10,
    width: "100%",
    borderRadius: 8,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: COLORS.textPrimary,
  },

  listItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});
