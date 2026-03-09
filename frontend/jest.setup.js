// Mocking react-native-svg
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, width, height }) => 
      React.createElement(View, { 
        testID: "svg",
        accessibilityLabel: `svg-${width}x${height}` 
      }, children),
    Svg: ({ children, width, height }) => 
      React.createElement(View, { 
        testID: "svg",
        accessibilityLabel: `svg-${width}x${height}` 
      }, children),
    SvgXml: "SvgXml",
    Polygon: ({ points, fill, stroke, strokeWidth }) => 
      React.createElement(View, {
        testID: "polygon",
        accessibilityLabel: `polygon-${points}`,
        accessibilityHint: `fill:${fill},stroke:${stroke},strokeWidth:${strokeWidth}`
      }),
    Circle: "Circle",
    Path: "Path",
    G: "G",
  };
});

// Mocking @openspacelabs/react-native-zoomable-view
jest.mock("@openspacelabs/react-native-zoomable-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ReactNativeZoomableView: React.forwardRef(({ children }, ref) => {
      React.useImperativeHandle(ref, () => ({
        zoomTo: jest.fn(),
        moveTo: jest.fn(),
      }));
      return React.createElement(View, {}, children);
    }),
  };
});

// Mocking Expo Router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
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
    setParams: jest.fn(),
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
