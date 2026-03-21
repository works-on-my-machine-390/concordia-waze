import ScheduleClassCard from "@/components/schedule/ScheduleClassCard";
import { render } from "@testing-library/react-native";

describe("ScheduleClassCard", () => {
  test("renders course name, section, type, time, and location", () => {
    const { getByText } = render(
      <ScheduleClassCard
        courseName="SOEN 341"
        classInfo={{
          type: "Lecture",
          section: "AA-BB",
          day: "MON",
          startTime: "10:00",
          endTime: "11:15",
          buildingCode: "H",
          room: "110",
        }}
        backgroundColor="#800000"
        textColor="#FFFFFF"
      />,
    );

    expect(getByText("SOEN 341 - AA BB")).toBeTruthy();
    expect(getByText("Lecture")).toBeTruthy();
    expect(getByText("MON 10:00 - 11:15")).toBeTruthy();
    expect(getByText("H 110")).toBeTruthy();
  });

  test("does not show hyphen when section is empty", () => {
    const { getByText, queryByText } = render(
      <ScheduleClassCard
        courseName="COMP 346"
        classInfo={{
          type: "Lab",
          section: "",
          day: "TUE",
          startTime: "13:00",
          endTime: "15:00",
          buildingCode: "MB",
          room: "2.130",
        }}
        backgroundColor="#4180C0"
        textColor="#FFFFFF"
      />,
    );

    expect(getByText("COMP 346")).toBeTruthy();
    expect(queryByText("COMP 346 - ")).toBeNull();
  });

  test("renders safely when building and room are empty", () => {
    const { getByText, queryByText } = render(
      <ScheduleClassCard
        courseName="SOEN 363"
        classInfo={{
          type: "Tutorial",
          section: "TT",
          day: "WED",
          startTime: "13:45",
          endTime: "16:00",
          buildingCode: "",
          room: "",
        }}
        backgroundColor="#4180C0"
        textColor="#FFFFFF"
      />,
    );

    expect(getByText("SOEN 363 - TT")).toBeTruthy();
    expect(getByText("Tutorial")).toBeTruthy();
    expect(getByText("WED 13:45 - 16:00")).toBeTruthy();
    expect(queryByText("H 110")).toBeNull();
  });
});