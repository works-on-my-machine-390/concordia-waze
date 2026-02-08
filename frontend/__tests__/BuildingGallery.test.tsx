import { useGetBuildingImages } from "@/hooks/queries/buildingQueries";
import { render } from "@testing-library/react-native";
import { Image } from "react-native";
import BuildingGallery from "../components/BuildingGallery";

jest.mock("@/hooks/queries/buildingQueries");

jest.mock("react-native-reanimated-carousel", () => {
  const { View } = require("react-native");

  return ({ data, renderItem, testID }: any) => (
    <View testID={testID || "carousel"}>
      {Array.isArray(data)
        ? data.map((item, index) => (
            <View key={item?.id ?? index} testID={`carousel-item-${index}`}>
              {renderItem({ item, index })}
            </View>
          ))
        : null}
    </View>
  );
});

describe("BuildingGallery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders a carousel with images when query succeeds", () => {
    (useGetBuildingImages as jest.Mock).mockReturnValue({
      data: ["https://example.com/one.jpg", "https://example.com/two.jpg"],
      isSuccess: true,
    });

    const { getByTestId, UNSAFE_getAllByType } = render(
      <BuildingGallery buildingCode="MB" />,
    );

    expect(getByTestId("carousel")).toBeTruthy();

    const images = UNSAFE_getAllByType(Image);
    expect(images).toHaveLength(2);
    expect(images[0].props.source).toEqual({
      uri: "https://example.com/one.jpg",
    });
    expect(images[1].props.source).toEqual({
      uri: "https://example.com/two.jpg",
    });
  });

  test("does not render carousel when query has no images", () => {
    (useGetBuildingImages as jest.Mock).mockReturnValue({
      data: [],
      isSuccess: true,
    });

    const { queryByTestId } = render(
      <BuildingGallery buildingCode="MB" />,
    );

    expect(queryByTestId("carousel")).toBeNull();
  });

  test("does not render carousel when query is not successful", () => {
    (useGetBuildingImages as jest.Mock).mockReturnValue({
      data: ["https://example.com/one.jpg"],
      isSuccess: false,
    });

    const { queryByTestId } = render(<BuildingGallery buildingCode="MB" />);

    expect(queryByTestId("carousel")).toBeNull();
  });
});
