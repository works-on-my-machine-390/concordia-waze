import { render } from "@testing-library/react-native";
import MetroAccessibleChip from "../components/MetroAccessibleChip";

const mockMaterialIcons = jest.fn((props: unknown) => null);

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: (props: unknown) => mockMaterialIcons(props),
}));

describe("MetroAccessibleChip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders accessible tunnel label", () => {
    const { getByText } = render(<MetroAccessibleChip />);

    expect(getByText("Accessible by tunnel")).toBeTruthy();
  });

  test("renders subway icon with expected props", () => {
    render(<MetroAccessibleChip />);

    expect(mockMaterialIcons).toHaveBeenCalledWith(
      expect.objectContaining({ name: "subway", size: 26, color: "#0E4C92" }),
    );
  });
});