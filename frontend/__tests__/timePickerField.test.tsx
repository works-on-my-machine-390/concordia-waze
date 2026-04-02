import React from "react";
import { Modal, Platform, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import TimePickerField from "@/components/classes/TimePickerField";

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockDateTimePicker(props: any) {
    return (
      <Text
        testID="mock-datetime-picker"
        onPress={() =>
          props.onChange?.({}, new Date(2024, 0, 1, 14, 30))
        }
      >
        Mock DateTimePicker
      </Text>
    );
  };
});

describe("TimePickerField", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      value: originalPlatform,
    });
  });

  it("renders the placeholder when value is empty", () => {
    const { getByText } = render(
      <TimePickerField value="" onChange={jest.fn()} placeholder="09:00" />,
    );

    expect(getByText("09:00")).toBeTruthy();
  });

  it("renders the value when provided", () => {
    const { getByText } = render(
      <TimePickerField value="13:45" onChange={jest.fn()} />,
    );

    expect(getByText("13:45")).toBeTruthy();
  });

  it("opens the Android picker and updates time when a date is selected", () => {
    Object.defineProperty(Platform, "OS", {
      value: "android",
    });

    const onChangeMock = jest.fn();

    const { getByText, getByTestId, queryByTestId } = render(
      <TimePickerField value="09:00" onChange={onChangeMock} />,
    );

    fireEvent.press(getByText("09:00"));

    expect(getByTestId("mock-datetime-picker")).toBeTruthy();

    fireEvent.press(getByTestId("mock-datetime-picker"));

    expect(onChangeMock).toHaveBeenCalledWith("14:30");
    expect(queryByTestId("mock-datetime-picker")).toBeNull();
  });

  it("opens the iOS modal with picker", () => {
    Object.defineProperty(Platform, "OS", {
      value: "ios",
    });

    const { getByText, getByTestId } = render(
      <TimePickerField value="09:00" onChange={jest.fn()} />,
    );

    fireEvent.press(getByText("09:00"));

    expect(getByText("Cancel")).toBeTruthy();
    expect(getByText("Done")).toBeTruthy();
    expect(getByTestId("mock-datetime-picker")).toBeTruthy();
  });

  it("updates temp date on iOS and confirms with Done", () => {
    Object.defineProperty(Platform, "OS", {
      value: "ios",
    });

    const onChangeMock = jest.fn();

    const { getByText, getByTestId } = render(
      <TimePickerField value="09:00" onChange={onChangeMock} />,
    );

    fireEvent.press(getByText("09:00"));
    fireEvent.press(getByTestId("mock-datetime-picker"));
    fireEvent.press(getByText("Done"));

    expect(onChangeMock).toHaveBeenCalledWith("14:30");
  });

  it("closes the iOS modal without calling onChange when Cancel is pressed", () => {
    Object.defineProperty(Platform, "OS", {
      value: "ios",
    });

    const onChangeMock = jest.fn();

    const { getByText, queryByText } = render(
      <TimePickerField value="09:00" onChange={onChangeMock} />,
    );

    fireEvent.press(getByText("09:00"));
    fireEvent.press(getByText("Cancel"));

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(queryByText("Done")).toBeNull();
  });
});