import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  POI_DEFAULT_RANK_PREFERENCE,
  TextSearchRankPreferenceType,
} from "@/hooks/queries/poiQueries";
import PoiSearchRankPreferenceFilter from "../components/poi/PoiSearchRankPreferenceFilter";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");

describe("PoiSearchRankPreferenceFilter", () => {
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
  const mockedUseRouter = useRouter as jest.Mock;

  const mockSetParams = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      setParams: mockSetParams,
    });
  });

  test("sets default rank preference when missing", async () => {
    mockedUseLocalSearchParams.mockReturnValue({});

    render(<PoiSearchRankPreferenceFilter onChange={jest.fn()} />);

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith({
        rankPref: POI_DEFAULT_RANK_PREFERENCE,
      });
    });
  });

  test("renders selected rank preference text", () => {
    mockedUseLocalSearchParams.mockReturnValue({
      rankPref: TextSearchRankPreferenceType.RELEVANCE,
    });

    const { getByText } = render(
      <PoiSearchRankPreferenceFilter onChange={jest.fn()} />,
    );

    expect(getByText("Relevance")).toBeTruthy();
  });

  test("opens dropdown and changes preference", () => {
    mockedUseLocalSearchParams.mockReturnValue({
      rankPref: TextSearchRankPreferenceType.RELEVANCE,
    });

    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <PoiSearchRankPreferenceFilter onChange={onChange} />,
    );

    fireEvent.press(getByText("Relevance"));
    expect(getByText("Distance")).toBeTruthy();

    fireEvent.press(getByText("Distance"));

    expect(mockSetParams).toHaveBeenCalledWith({
      rankPref: TextSearchRankPreferenceType.DISTANCE,
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(queryByText("Distance")).toBeNull();
  });

  test("does not refetch when selecting current preference", () => {
    mockedUseLocalSearchParams.mockReturnValue({
      rankPref: TextSearchRankPreferenceType.DISTANCE,
    });

    const onChange = jest.fn();
    const { getByText, getAllByText } = render(
      <PoiSearchRankPreferenceFilter onChange={onChange} />,
    );

    fireEvent.press(getByText("Distance"));
    fireEvent.press(getAllByText("Distance")[1]);

    expect(onChange).not.toHaveBeenCalled();
    expect(mockSetParams).not.toHaveBeenCalledWith({
      rankPref: TextSearchRankPreferenceType.DISTANCE,
    });
  });
});
