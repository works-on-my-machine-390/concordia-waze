import { render } from "@testing-library/react-native";
import WalkingDottedLine from "../components/WalkingDottedLine";

const mockSvg = jest.fn(({ children }) => children);
const mockCircle = jest.fn((props: unknown) => null);
const mockDefs = jest.fn(({ children }) => children);
const mockPattern = jest.fn(({ children }) => children);
const mockRect = jest.fn((props: unknown) => null);

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: (props: unknown) => mockSvg(props),
  Circle: (props: unknown) => mockCircle(props),
  Defs: (props: any) => mockDefs(props),
  Pattern: (props: any) => mockPattern(props),
  Rect: (props: unknown) => mockRect(props),
}));

describe("WalkingDottedLine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders default dimensions and default dot color", () => {
    const { toJSON } = render(<WalkingDottedLine />);

    const tree = toJSON() as { props?: { style?: { height: number; width: number } } };
    expect(tree.props?.style).toEqual(
      expect.objectContaining({ height: 96, width: 20 }),
    );

    expect(mockSvg).toHaveBeenCalledWith(
      expect.objectContaining({ height: "100%", width: "100%" }),
    );
    expect(mockPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "dotPattern",
        width: "24",
        height: "12",
        patternUnits: "userSpaceOnUse",
      }),
    );
    expect(mockCircle).toHaveBeenCalledWith(
      expect.objectContaining({ cx: "10", cy: "6", r: "3", fill: "#4285F4" }),
    );
    expect(mockRect).toHaveBeenCalledWith(
      expect.objectContaining({ width: "100%", height: "100%", fill: "url(#dotPattern)" }),
    );
  });

  test("uses provided height and color", () => {
    const { toJSON } = render(
      <WalkingDottedLine height={140} color="#123456" />,
    );

    const tree = toJSON() as { props?: { style?: { height: number } } };
    expect(tree.props?.style).toEqual(expect.objectContaining({ height: 140 }));
    expect(mockCircle).toHaveBeenCalledWith(
      expect.objectContaining({ fill: "#123456" }),
    );
  });
});