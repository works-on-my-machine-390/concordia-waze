import {
    MapCameraProvider,
    MoveCameraParams,
    useMapCamera,
} from "@/contexts/MapCameraContext";
import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "react-native";

function Consumer({ params }: { params: MoveCameraParams }) {
  const { moveCamera } = useMapCamera();

  return (
    <Button
      title="move-camera"
      onPress={() => {
        moveCamera(params);
      }}
    />
  );
}

describe("MapCameraContext", () => {
  test("uses default no-op moveCamera when no provider is present", () => {
    const params: MoveCameraParams = {
      latitude: 45.497,
      longitude: -73.579,
      duration: 500,
    };

    const { getByText } = render(<Consumer params={params} />);

    expect(() => {
      fireEvent.press(getByText("move-camera"));
    }).not.toThrow();
  });

  test("exposes provider moveCamera implementation to descendants", () => {
    const mockMoveCamera = jest.fn();
    const params: MoveCameraParams = {
      latitude: 45.5,
      longitude: -73.6,
      delta: 0.01,
      duration: 750,
    };

    const { getByText } = render(
      <MapCameraProvider moveCamera={mockMoveCamera}>
        <Consumer params={params} />
      </MapCameraProvider>,
    );

    fireEvent.press(getByText("move-camera"));

    expect(mockMoveCamera).toHaveBeenCalledTimes(1);
    expect(mockMoveCamera).toHaveBeenCalledWith(params);
  });
});
