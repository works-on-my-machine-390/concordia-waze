import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import DeleteConfirmDialog from "../components/schedule/DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
  it("renders dialog content when visible", () => {
    const { getByText } = render(
      <DeleteConfirmDialog
        visible
        courseName="SOEN 341"
        isPending={false}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText("Delete Class?")).toBeTruthy();
    expect(getByText("SOEN 341")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();
  });

  it("does not show content when not visible", () => {
    const { queryByText } = render(
      <DeleteConfirmDialog
        visible={false}
        courseName="SOEN 341"
        isPending={false}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByText("Delete Class?")).toBeNull();
  });

  it("calls onCancel when close button is pressed", () => {
    const onCancel = jest.fn();

    const { getByText } = render(
      <DeleteConfirmDialog
        visible
        courseName="SOEN 341"
        isPending={false}
        onCancel={onCancel}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(getByText("✕"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete when delete button is pressed", () => {
    const onDelete = jest.fn();

    const { getByText } = render(
      <DeleteConfirmDialog
        visible
        courseName="SOEN 341"
        isPending={false}
        onCancel={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(getByText("Delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows pending state", () => {
    const { queryByText } = render(
      <DeleteConfirmDialog
        visible
        courseName="SOEN 341"
        isPending
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(queryByText("Delete")).toBeNull();
  });
});