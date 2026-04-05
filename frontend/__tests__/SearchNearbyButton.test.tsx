import { fireEvent, render } from "@testing-library/react-native";
import SearchNearbyButton from "../components/poi/SearchNearbyButton";

describe("SearchNearbyButton", () => {
  test("renders trimmed query in button text", () => {
    const { getByText } = render(
      <SearchNearbyButton query="   coffee shop   " onPress={jest.fn()} />,
    );

    expect(getByText('Search nearby for "coffee shop"')).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SearchNearbyButton query="coffee" onPress={onPress} />,
    );

    fireEvent.press(getByText('Search nearby for "coffee"'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("does not throw when pressed without onPress", () => {
    const { getByText } = render(<SearchNearbyButton query="coffee" />);

    expect(() => fireEvent.press(getByText('Search nearby for "coffee"'))).not.toThrow();
  });
});