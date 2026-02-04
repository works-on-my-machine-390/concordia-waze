import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import BuildingBottomSheet from '@/components/BuildingBottomSheet';

export default function ExampleScreen() {
  const router = useRouter();

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

  return (
    <View style={{ flex: 1 }}>
      <BuildingBottomSheet building={mockBuilding} />
    </View>
  );
}