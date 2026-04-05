import { render } from "@testing-library/react-native";
import { TermsText } from "../components/TermsText";

describe("TermsText", () => {
  test("renders agreement sentence and links", () => {
    const { getByText } = render(<TermsText />);

    expect(
      getByText("By creating an account, you agree to our", { exact: false }),
    ).toBeTruthy();
    expect(getByText("Terms of Service")).toBeTruthy();
    expect(getByText("Privacy Policy")).toBeTruthy();
  });
});