import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from '../app/constants';
import {
  CloseIcon,
  ElevatorIcon,
  EscalatorIcon,
  FavoriteEmptyIcon,
  GetDirectionsIcon,
  WheelchairIcon,
} from '../app/icons';

type Building = {
  name: string;
  acronym: string;
  address: string;
  services: string[];
  departments: string[];
  accessibility: {
    wheelchair: boolean;
    elevator: boolean;
    escalator: boolean;
  };
};

// Reusable list section
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

type Props = {
  building: Building;
};

export default function BuildingBottomSheet({ building }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);

  const snapPoints = useMemo(() => ['20%', '70%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  const accessibilityIcons = useMemo(
    () =>
      [
        building.accessibility.wheelchair && (
          <WheelchairIcon key="wheelchair" color="#0E4C92" size={24} />
        ),
        building.accessibility.elevator && (
          <ElevatorIcon key="elevator" color="#0E4C92" size={30} />
        ),
        building.accessibility.escalator && (
          <EscalatorIcon key="escalator" color="#0E4C92" size={30} />
        ),
      ].filter(Boolean),
    [building.accessibility]
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
              {building.name} ({building.acronym})
            </Text>
            <Text style={styles.address}>{building.address}</Text>
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

        {/* Scrollable Content */}
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {sheetIndex > 0 && (
            <>
              <ListSection
                title="Services"
                items={building.services}
              />
              <ListSection
                title="Departments"
                items={building.departments}
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
    paddingVertical: 16
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
    alignItems: 'flex-start',
    justifyContent: 'center',
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  acessibilityIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  listContainer: {
    marginBottom: 20,
    backgroundColor: '#f2f2f2',
    padding: 10,
    width: '100%',
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