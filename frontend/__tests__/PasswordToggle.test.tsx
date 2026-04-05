import { fireEvent, render } from "@testing-library/react-native";
import { TouchableOpacity } from "react-native";
import PasswordToggle from "../components/PasswordToggle";

const mockEyeHidingIcon = jest.fn(() => null);
const mockEyeShowingIcon = jest.fn(() => null);

jest.mock("../app/icons", () => ({
  EyeHidingIcon: (props: unknown) => mockEyeHidingIcon(props),
  EyeShowingIcon: (props: unknown) => mockEyeShowingIcon(props),
}));

describe("PasswordToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders showing icon when show is false", () => {
    render(<PasswordToggle show={false} onPress={jest.fn()} />);

    expect(mockEyeShowingIcon).toHaveBeenCalledWith(
      expect.objectContaining({ size: 24, color: expect.any(String) }),
    );
    expect(mockEyeHidingIcon).not.toHaveBeenCalled();
  });

  test("renders hiding icon when show is true", () => {
    render(<PasswordToggle show={true} onPress={jest.fn()} />);

    expect(mockEyeHidingIcon).toHaveBeenCalledWith(
      expect.objectContaining({ size: 24, color: expect.any(String) }),
    );
    expect(mockEyeShowingIcon).not.toHaveBeenCalled();
  });

  test("calls onPress when touched", () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <PasswordToggle show={false} onPress={onPress} />,
    );

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});