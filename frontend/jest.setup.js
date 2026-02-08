// Mocking AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mocking Expo Router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    push: jest.fn(),
    setParams: jest.fn(),
  })),
  Stack: {
    Screen: () => null,
  },
}));
