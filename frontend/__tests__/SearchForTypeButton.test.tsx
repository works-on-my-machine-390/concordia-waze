import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import SearchForTypeButton from "../components/SearchForTypeButton";

describe("SearchForTypeButton", () => {
  test("renders label and icon", () => {
    const { getByText } = render(
      <SearchForTypeButton
        label="Search for bathroom"
        icon={<Text>Icon</Text>}
        onPress={jest.fn()}
      />,
    );

    expect(getByText("Search for bathroom")).toBeTruthy();
    expect(getByText("Icon")).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SearchForTypeButton label="Search" onPress={onPress} />,
    );

    fireEvent.press(getByText("Search"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("does not throw if onPress is undefined", () => {
    const { getByText } = render(<SearchForTypeButton label="Search" />);

    expect(() => fireEvent.press(getByText("Search"))).not.toThrow();
  });
});