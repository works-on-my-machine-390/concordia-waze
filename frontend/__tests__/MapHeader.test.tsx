/**
 * Tests for MapHeader component
 */
import { render, fireEvent } from "@testing-library/react-native";
import { MapHeader } from "@/components/MapHeader";

describe("MapHeader", () => {
  test("SGW button is active when campus prop is 'SGW'", () => {
    const { getByText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const sgwButton = getByText("SGW");
    const loyolaButton = getByText("Loyola");

    // SGW button should have active text color (soft pink)
    expect(sgwButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#DEBDC4" })]),
    );

    // Loyola button should not be active
    expect(loyolaButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#222" })]),
    );
  });

  test("Loyola button is active when campus prop is 'Loyola'", () => {
    const { getByText } = render(
      <MapHeader
        campus="LOY"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const loyolaButton = getByText("Loyola");
    const sgwButton = getByText("SGW");

    // Loyola button should now be active (soft pink)
    expect(loyolaButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#DEBDC4" })]),
    );

    // SGW button should now be inactive (dark gray)
    expect(sgwButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#222" })]),
    );
  });

  test("Clicking SGW or Loyola button calls onCampusChange with correct value", () => {
    const mockOnCampusChange = jest.fn();

    const { getByText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={mockOnCampusChange}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const loyolaButton = getByText("Loyola");
    const sgwButton = getByText("SGW");

    fireEvent.press(loyolaButton);
    expect(mockOnCampusChange).toHaveBeenCalledWith("LOY");

    fireEvent.press(sgwButton);
    expect(mockOnCampusChange).toHaveBeenCalledWith("SGW");
  });

  // TO DO: need more tests for menu button and search input
});
