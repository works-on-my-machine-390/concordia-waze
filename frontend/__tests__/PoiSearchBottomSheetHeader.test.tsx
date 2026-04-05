import { fireEvent, render } from "@testing-library/react-native";
import { TouchableOpacity } from "react-native";
import PoiSearchBottomSheetHeader from "../components/poi/PoiSearchBottomSheetHeader";

const mockCloseIcon = jest.fn((props: unknown) => null);

jest.mock("../app/icons", () => ({
  CloseIcon: (props: unknown) => mockCloseIcon(props),
}));

describe("PoiSearchBottomSheetHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nearby results title", () => {
    const { getByText } = render(<PoiSearchBottomSheetHeader />);

    expect(getByText("Nearby results")).toBeTruthy();
  });

  test("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <PoiSearchBottomSheetHeader onClose={onClose} />,
    );

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders close icon with expected size", () => {
    render(<PoiSearchBottomSheetHeader />);

    expect(mockCloseIcon).toHaveBeenCalledWith(
      expect.objectContaining({ size: 24 }),
    );
  });
});