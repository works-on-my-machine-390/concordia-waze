import { fireEvent, render } from "@testing-library/react-native";
import ActiveNavigationHeaderStepper from "../components/activeNavigation/ActiveNavigationHeaderStepper";

jest.mock("../app/icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    BackIcon: () => React.createElement(Text, { testID: "back-icon" }, "BackIcon"),
    ForwardIcon: () =>
      React.createElement(Text, { testID: "forward-icon" }, "ForwardIcon"),
  };
});

describe("ActiveNavigationHeaderStepper", () => {
  test("hides previous button on the first step", () => {
    const { queryByTestId } = render(
      <ActiveNavigationHeaderStepper
        currentStepIndex={0}
        totalSteps={3}
        onPreviousStep={jest.fn()}
        mainActionPress={jest.fn()}
        mainActionText={() => "Next step"}
      />,
    );

    expect(queryByTestId("back-icon")).toBeNull();
  });

  test("shows previous button and calls previous handler", () => {
    const onPreviousStep = jest.fn();

    const { getByTestId } = render(
      <ActiveNavigationHeaderStepper
        currentStepIndex={1}
        totalSteps={3}
        onPreviousStep={onPreviousStep}
        mainActionPress={jest.fn()}
        mainActionText={() => "Next step"}
      />,
    );

    fireEvent.press(getByTestId("back-icon").parent as any);

    expect(onPreviousStep).toHaveBeenCalledTimes(1);
  });

  test("calls main action and hides forward icon on last step", () => {
    const onMainAction = jest.fn();

    const { getByText, queryByTestId } = render(
      <ActiveNavigationHeaderStepper
        currentStepIndex={2}
        totalSteps={3}
        onPreviousStep={jest.fn()}
        mainActionPress={onMainAction}
        mainActionText={() => "Finish"}
      />,
    );

    fireEvent.press(getByText("Finish"));

    expect(onMainAction).toHaveBeenCalledTimes(1);
    expect(queryByTestId("forward-icon")).toBeNull();
  });
});
