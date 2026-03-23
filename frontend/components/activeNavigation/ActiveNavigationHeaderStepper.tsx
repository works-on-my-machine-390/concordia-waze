import { BackIcon, ForwardIcon } from "@/app/icons";
import { activeNavigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  currentStepIndex: number;
  totalSteps: number;
  onPreviousStep: () => void;
  mainActionPress: () => void;
  mainActionText: () => string;
};

export default function ActiveNavigationHeaderStepper(props: Readonly<Props>) {
  const isLastStep = props.currentStepIndex === props.totalSteps - 1;

  return (
    <View style={[activeNavigationHeaderStyles.stepperContainer]}>
      {props.currentStepIndex !== 0 && (
        <TouchableOpacity
          style={[activeNavigationHeaderStyles.previousButton]}
          onPress={props.onPreviousStep}
        >
          <View
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BackIcon size={20} />
          </View>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={activeNavigationHeaderStyles.nextButton}
        onPress={props.mainActionPress}
      >
        <Text style={{ fontSize: 16 }}>{props.mainActionText()}</Text>
        {!isLastStep && <ForwardIcon size={20} />}
      </TouchableOpacity>
    </View>
  );
}
