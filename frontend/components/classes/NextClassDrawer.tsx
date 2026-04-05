import { COLORS } from "@/app/constants";
import { DrawerCloseIcon, DrawerOpenIcon } from "@/app/icons";
import NextClassCard from "@/components/classes/NextClassCard";
import { NextClassResponse } from "@/hooks/queries/classQueries";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

type Props = {
  nextClass: NextClassResponse | null;
};

const PEEK_AMOUNT = 48;
const ANIMATION_DURATION = 300;

export default function NextClassDrawer({ nextClass }: Readonly<Props>) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const translateX = useRef(new Animated.Value(-9999)).current;

  const handleLayout = (event: any) => {
    const width = event.nativeEvent.layout.width;
    setCardWidth(width);
    if (!isOpen) {
      translateX.setValue(-width);
    }
  };

  const toggle = () => {
    if (isOpen) {
      Animated.timing(translateX, {
        toValue: -cardWidth,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    } else {
      setIsOpen(true);
      Animated.timing(translateX, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.wrapper, { transform: [{ translateX }] }]}
    >
      <Pressable onPress={toggle} testID="next-class-drawer-pull-tab">
        <NextClassCard nextClass={nextClass} />
        <View style={styles.tab}>
          {isOpen ? (
            <DrawerCloseIcon size={35} color="white" />
          ) : (
            <DrawerOpenIcon size={35} color="white" />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 30,
    left: 0,
  },
  tab: {
    position: "absolute",
    right: -PEEK_AMOUNT,
    top: 0,
    bottom: 12,
    width: PEEK_AMOUNT,
    backgroundColor: COLORS.conuRed,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
