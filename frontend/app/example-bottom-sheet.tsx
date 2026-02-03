import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from "./constants";
import { CloseIcon, ElevatorIcon, EscalatorIcon, FavoriteEmptyIcon, GetDirectionsIcon, WheelchairIcon } from "./icons";

export default function exampleBottomSheet() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const snapPoints = useMemo(() => ['20%', '70%'], []);
  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  // Mock building because no building information yet
  const mockBuilding = {
    name: 'John Molson Building',
    acronym: 'MB',
    address: '1450 Guy St, Montreal',
    services: ["Career Management Service", "First Stop", "John Molson Executive Centre", "Performing Arts Faciliting", "Zen Den"],
    departments: ["Accountacy", "Contemporary Dance", "Executive MBA Program", "Finance", "Goodman Institute of Investment Management", "Mangement", "Marketing", "Music", "Supply Chain & Business Technology Management", "Theatre", "Accolknuntacy", "Contempivgorary Dance", "Executivekjb MBA Program", "Finankjbce", "Goodkjbman Institute of Investment Management", "Mangekjhbment", "Markekjbting", "Muskjbic", "Sujbpply Chain & Business Technology Management", "Theakjbtre", "fbvfdb", "vfbfdv", "vbefgbr", "vsvdfv", "vefrvgerfv", "fvefvefbv", "bfbegfb", "fvfbgbeD", "fbefbb"],
    accessibility: {
      wheelchair: true, 
      elevator: true,
      escalator: true
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
        <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enableContentPanningGesture={true}
        backgroundStyle={styles.bottomSheet}
        enableDynamicSizing={false}
        detached={true}
        containerStyle={{ overflow: 'visible' }}
        >
            <View style={styles.contentContainer}>
                <View style={styles.floatingIcon}>
                  <GetDirectionsIcon size={90} color={COLORS.maroon}/>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.name}>{mockBuilding.name} ({mockBuilding.acronym})</Text>
                    <Text style={styles.address}>{mockBuilding.address}</Text>
                </View>

                <View style={styles.iconsContainer}>
                    <View style={styles.acessibilityIconsContainer}>
                        {mockBuilding.accessibility.wheelchair && (<WheelchairIcon color={"#0E4C92"} size={24}/>)}
                        {mockBuilding.accessibility.elevator && (<ElevatorIcon color={"#0E4C92"} size={30}/>)}
                        {mockBuilding.accessibility.escalator && (<EscalatorIcon color={"#0E4C92"} size={30}/>)}
                    </View>
                    <View style={styles.acessibilityIconsContainer}>
                        <FavoriteEmptyIcon color={COLORS.maroon}/>
                        <CloseIcon size={28}/>
                    </View>
                </View>
            </View>

            {/* Scrollable content (services and departments)*/}
            <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>

                {/* Services*/}
                {sheetIndex > 0 && (
                <View style={styles.listContainer}>
                    <Text style={styles.listTitle}>Services</Text>
                    {mockBuilding.services.map((service) => (
                    <Text key={service} style={styles.listItem}>{service}</Text>
                    ))}
                </View>
                )}

                {/* Departments */}
                {sheetIndex > 0 && (
                <View style={styles.listContainer}>
                    <Text style={styles.listTitle}>Departments</Text>
                    {mockBuilding.departments.map((dept) => (
                    <Text key={dept} style={styles.listItem}>{dept}</Text>
                    ))}
                </View>
                )}
            </BottomSheetScrollView>
        </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  bottomSheet : {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12
  },
  floatingIcon: {
    position: 'absolute',
    top: -60,  
    right: 10,      
    zIndex: 10, 
    borderRadius: 20,
    padding: 6
  },
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  contentContainer: {
    paddingHorizontal: '5%',
    paddingTop: '5%',
    paddingBottom: '1%',   
    alignItems: 'flex-start'
  },
  textContainer: {
    alignItems: "flex-start",
    justifyContent: "center"
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.textPrimary
  },
  address: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.textSecondary
  },
  iconsContainer: {
    width: "100%",
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    marginTop: '3%',
  },
  acessibilityIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  listContainer: {
    marginBottom: 20,
    backgroundColor: '#f2f2f2',
    padding: 10,
    width: "100%",
    borderRadius: 8
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
