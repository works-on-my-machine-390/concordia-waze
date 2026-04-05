import { render } from "@testing-library/react-native";
import ListSection from "../components/BottomSheetListSection";

describe("BottomSheetListSection", () => {
  test("renders title and each item when items are present", () => {
    const { getByText, queryByText } = render(
      <ListSection title="Services" items={["WiFi", "Study Space"]} />,
    );

    expect(getByText("Services")).toBeTruthy();
    expect(getByText("WiFi")).toBeTruthy();
    expect(getByText("Study Space")).toBeTruthy();
    expect(queryByText("No information available")).toBeNull();
  });

  test("renders fallback text when items are empty", () => {
    const { getByText } = render(
      <ListSection title="Departments" items={[]} />,
    );

    expect(getByText("Departments")).toBeTruthy();
    expect(getByText("No information available")).toBeTruthy();
  });
});