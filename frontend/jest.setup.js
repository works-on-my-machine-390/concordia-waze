module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "src/**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
  ],
};

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

// Mocking Toastify React Native
jest.mock("toastify-react-native", () => ({
  Toast: {
    show: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mocking expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

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
