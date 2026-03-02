import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import FloorSelector from "../components/indoor/FloorSelector";

const mockFloors: Floor[] = [
  {
    number: 1,
    name: "Floor 1",
    imgPath: "floormaps/H_1.svg",
    vertices: [],
    edges: [],
    pois: [],
  },
  {
    number: 2,
    name: "Floor 2",
    imgPath: "floormaps/H_2.svg",
    vertices: [],
    edges: [],
    pois: [],
  },
  {
    number: 8,
    name: "Floor 8",
    imgPath: "floormaps/H_8.svg",
    vertices: [],
    edges: [],
    pois: [],
  },
];

describe("FloorSelector", () => {
  test("renders nothing when floors array is empty", () => {
    const onSelectFloor = jest.fn();
    const { toJSON } = renderWithProviders(
      <FloorSelector
        floors={[]}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  test("renders all floor buttons", () => {
    const onSelectFloor = jest.fn();
    const { getByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
      />,
    );

    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
  });

  test("applies active style to selected floor button", () => {
    const onSelectFloor = jest.fn();
    const { getByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={2}
        onSelectFloor={onSelectFloor}
      />,
    );

    const button2 = getByText("2").parent?.parent;
    const button1 = getByText("1").parent?.parent;

    const button2Styles = Array.isArray(button2?.props.style)
      ? button2.props.style
      : [button2?.props.style];
    const button1Styles = Array.isArray(button1?.props.style)
      ? button1.props.style
      : [button1?.props.style];

    expect(button2Styles).toContainEqual(
      expect.objectContaining({ backgroundColor: "#912338" }),
    );
    expect(button1Styles).not.toContainEqual(
      expect.objectContaining({ backgroundColor: "#912338" }),
    );
  });

  test("applies active text style to selected floor", () => {
    const onSelectFloor = jest.fn();
    const { getByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={2}
        onSelectFloor={onSelectFloor}
      />,
    );

    const text2 = getByText("2");
    const text1 = getByText("1");

    const text2Styles = Array.isArray(text2.props.style)
      ? text2.props.style
      : [text2.props.style];
    const text1Styles = Array.isArray(text1.props.style)
      ? text1.props.style
      : [text1.props.style];

    expect(text2Styles).toContainEqual(
      expect.objectContaining({ color: "#fff" }),
    );
    expect(text1Styles).not.toContainEqual(
      expect.objectContaining({ color: "#fff" }),
    );
  });

  test("calls onSelectFloor with correct floor number when button is pressed", () => {
    const onSelectFloor = jest.fn();
    const { getByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
      />,
    );

    fireEvent.press(getByText("8").parent?.parent as any);

    expect(onSelectFloor).toHaveBeenCalledWith(8);
    expect(onSelectFloor).toHaveBeenCalledTimes(1);
  });

  test("calls onSelectFloor when different floor buttons are pressed", () => {
    const onSelectFloor = jest.fn();
    const { getByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
      />,
    );

    fireEvent.press(getByText("2").parent?.parent as any);
    fireEvent.press(getByText("8").parent?.parent as any);

    expect(onSelectFloor).toHaveBeenCalledWith(2);
    expect(onSelectFloor).toHaveBeenCalledWith(8);
    expect(onSelectFloor).toHaveBeenCalledTimes(2);
  });

  test("renders buttons with correct floor numbers in order", () => {
    const onSelectFloor = jest.fn();
    const { getAllByText } = renderWithProviders(
      <FloorSelector
        floors={mockFloors}
        selectedFloor={1}
        onSelectFloor={onSelectFloor}
      />,
    );

    const buttons = [
      getAllByText("1")[0],
      getAllByText("2")[0],
      getAllByText("8")[0],
    ];

    expect(buttons).toHaveLength(3);
  });
});
