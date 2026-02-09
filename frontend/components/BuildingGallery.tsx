import { useGetBuildingImages } from "@/hooks/queries/buildingQueries";
import { useMemo } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");

type Props = {
  buildingCode: string;
};

const BuildingGallery = (props: Props) => {
  const imagesQuery = useGetBuildingImages(props.buildingCode);

  const items = useMemo(() => {
    if (!imagesQuery?.data) {
      return [];
    }

    return imagesQuery?.data.map((url, index) => ({ url, id: index })) || [];
  }, [imagesQuery.data]);

  return (
    <View style={styles.container}>
      {imagesQuery.isSuccess && items.length > 0 && (
        <Carousel
          loop={false}
          width={width}
          height={width / 1.5} // Aspect ratio wrapper
          data={items}
          scrollAnimationDuration={500}
          // Parallax effect config (optional, but looks nice)
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: 50,
          }}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "white",
    // Minimal shadow for depth
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export default BuildingGallery;
