"use client";

import { useRTL } from "@/hooks/useRTL";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PanResponder, StyleSheet, Text, View, ViewStyle } from "react-native";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onValueChange: (minValue: number, maxValue: number) => void;
  formatLabel?: (value: number) => string;
  title?: string;
  unit?: string; // '$', 'km', or empty for year
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onValueChange,
  formatLabel,
  title,
  unit = "",
}) => {
  const { rtlViewStyle, isRTL } = useRTL();

  const { i18n, t } = useTranslation();
  const [sliderWidth, setSliderWidth] = useState(0);
  const [leftThumbPosition, setLeftThumbPosition] = useState(0);
  const [rightThumbPosition, setRightThumbPosition] = useState(0);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Convert value to position
  const valueToPosition = (value: number) => {
    if (sliderWidth === 0) return 0;
    return ((value - min) / (max - min)) * sliderWidth;
  };

  // Convert position to value
  const positionToValue = (position: number) => {
    if (sliderWidth === 0) return min;
    let value = min + (position / sliderWidth) * (max - min);
    if (step) {
      value = Math.round(value / step) * step;
    }
    return Math.min(Math.max(value, min), max);
  };

  // --- MODIFIED FORMATTING LOGIC FOR RANGE TEXT ---
  const formatRangeValue = (value: number, isMax: boolean = false) => {
    if (formatLabel) {
      return formatLabel(value);
    }

    const formattedNum =
      i18n.language === "ar"
        ? value.toLocaleString("ar-EG")
        : value.toLocaleString();

    // Check if it's the maximum value and should display "Any"
    if (isMax && value === max) {
      if (unit === "$") {
        return i18n.language === "ar" ? t("الكل") : t("Any"); // Price "Any"
      } else if (unit === "km") {
        // Use plain "km" as the unit value
        return i18n.language === "ar"
          ? `${t("الكل")} ${t("km")}`
          : `${t("Any")} ${t("km")}`; // Kilometer "Any" with unit
      } else {
        // For Year or other types, just "Any"
        return i18n.language === "ar" ? t("الكل") : t("Any");
      }
    } else {
      // For specific numeric values
      if (unit === "$") {
        return `${formattedNum}`; // Price numbers have no unit suffix here, it's in the title
      } else if (unit === "km") {
        // Use plain "km" as the unit value
        return `${formattedNum} ${t("km")}`; // Kilometer numbers with unit
      } else {
        // For Year, no unit suffix
        return formattedNum;
      }
    }
  };
  // --- END: MODIFIED FORMATTING LOGIC ---

  // Initialize positions when slider width is available
  useEffect(() => {
    if (sliderWidth > 0 && !isReady) {
      const leftPos = valueToPosition(minValue);
      const rightPos = valueToPosition(maxValue);
      setLeftThumbPosition(leftPos);
      setRightThumbPosition(rightPos);
      setIsReady(true);
    }
  }, [sliderWidth, minValue, maxValue, min, max, isReady]);

  // Update positions when values change externally
  useEffect(() => {
    if (sliderWidth > 0 && isReady && !dragging) {
      setLeftThumbPosition(valueToPosition(minValue));
      setRightThumbPosition(valueToPosition(maxValue));
    }
  }, [minValue, maxValue, sliderWidth, isReady, dragging]);

  const leftThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isReady,
    onMoveShouldSetPanResponder: () => isReady,
    onPanResponderGrant: () => {
      setDragging("left");
    },
    onPanResponderMove: (_, gestureState) => {
      if (!isReady) return;

      const startPosition = valueToPosition(minValue);
      let newPosition = startPosition + gestureState.dx;
      newPosition = Math.max(0, Math.min(newPosition, rightThumbPosition - 20));
      setLeftThumbPosition(newPosition);

      const newValue = positionToValue(newPosition);
      onValueChange(newValue, maxValue);
    },
    onPanResponderRelease: () => {
      setDragging(null);
      if (isReady) {
        const finalValue = positionToValue(leftThumbPosition);
        onValueChange(finalValue, maxValue);
      }
    },
  });

  const rightThumbPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isReady,
    onMoveShouldSetPanResponder: () => isReady,
    onPanResponderGrant: () => {
      setDragging("right");
    },
    onPanResponderMove: (_, gestureState) => {
      if (!isReady) return;

      const startPosition = valueToPosition(maxValue);
      let newPosition = startPosition + gestureState.dx;
      newPosition = Math.min(
        sliderWidth,
        Math.max(newPosition, leftThumbPosition + 20)
      );
      setRightThumbPosition(newPosition);

      const newValue = positionToValue(newPosition);
      onValueChange(minValue, newValue);
    },
    onPanResponderRelease: () => {
      setDragging(null);
      if (isReady) {
        const finalValue = positionToValue(rightThumbPosition);
        onValueChange(minValue, finalValue);
      }
    },
  });

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setSliderWidth(width - 24);
    }
  };

  const titleContainerJustify: ViewStyle = {
    justifyContent: isRTL ? "flex-end" : "flex-start",
  };

  return (
    <View style={styles.container}>
      {title && (
        <View style={[styles.titleContainer, titleContainerJustify]}>
          <View style={[styles.titleAndRangeTextWrapper, rtlViewStyle]}>
            <Text style={styles.title}>{title}</Text>
            <Text
              style={[
                styles.rangeText,
                isRTL ? { marginRight: 8 } : { marginLeft: 8 },
              ]}
            >
              {formatRangeValue(minValue)} - {formatRangeValue(maxValue, true)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sliderContainer} onLayout={handleLayout}>
        <View style={styles.track} />
        <View
          style={[
            styles.range,
            {
              left: leftThumbPosition + 12,
              width: rightThumbPosition - leftThumbPosition,
            },
          ]}
        />

        <View
          {...leftThumbPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: leftThumbPosition,
              backgroundColor: dragging === "left" ? "#a00000" : "#ffffff",
              transform: [{ scale: dragging === "left" ? 1.2 : 1 }],
            },
          ]}
        />

        <View
          {...rightThumbPanResponder.panHandlers}
          style={[
            styles.thumb,
            {
              left: rightThumbPosition,
              backgroundColor: dragging === "right" ? "#a00000" : "#ffffff",
              transform: [{ scale: dragging === "right" ? 1.2 : 1 }],
            },
          ]}
        />
      </View>

      <View style={[styles.labelsContainer]}>
        <Text style={styles.label}>{formatRangeValue(min)}</Text>
        <Text style={styles.label}>{formatRangeValue(max, true)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  titleAndRangeTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  rangeText: {
    fontSize: 16,
    color: "#b80200",
    fontWeight: "500",
  },
  sliderContainer: {
    height: 40,
    position: "relative",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  track: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    right: 0,
  },
  range: {
    height: 4,
    backgroundColor: "#b80200",
    borderRadius: 2,
    position: "absolute",
  },
  thumb: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    position: "absolute",
    top: 8,
    marginLeft: -12,
    borderWidth: 2,
    borderColor: "#b80200",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
});

export default RangeSlider;
//--------------------------------------------------------------------------------------------
// import { useRTL } from "@/hooks/useRTL";
// import type React from "react";
// import { useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { PanResponder, StyleSheet, Text, View } from "react-native";

// interface RangeSliderProps {
//   min: number;
//   max: number;
//   step?: number;
//   minValue: number;
//   maxValue: number;
//   onValueChange: (minValue: number, maxValue: number) => void;
//   formatLabel?: (value: number) => string;
//   title?: string;
//   unit?: string;
// }

// const RangeSlider: React.FC<RangeSliderProps> = ({
//   min,
//   max,
//   step = 1,
//   minValue,
//   maxValue,
//   onValueChange,
//   formatLabel,
//   title,
//   unit = "",
// }) => {
//   const { rtlViewStyle_forRangeSlider, rtlViewStyle } = useRTL();

//   const { i18n, t } = useTranslation();
//   const [sliderWidth, setSliderWidth] = useState(0);
//   const [leftThumbPosition, setLeftThumbPosition] = useState(0);
//   const [rightThumbPosition, setRightThumbPosition] = useState(0);
//   const [dragging, setDragging] = useState<"left" | "right" | null>(null);
//   const [isReady, setIsReady] = useState(false);

//   // Convert value to position
//   const valueToPosition = (value: number) => {
//     if (sliderWidth === 0) return 0;
//     return ((value - min) / (max - min)) * sliderWidth;
//   };

//   // Convert position to value
//   const positionToValue = (position: number) => {
//     if (sliderWidth === 0) return min;
//     let value = min + (position / sliderWidth) * (max - min);
//     if (step) {
//       value = Math.round(value / step) * step;
//     }
//     return Math.min(Math.max(value, min), max);
//   };

//   // Format the displayed value
//   const formatValue = (value: number) => {
//     if (formatLabel) {
//       return formatLabel(value);
//     }

//     // Format based on language
//     if (i18n.language === "ar") {
//       // Convert to Arabic numerals
//       return value.toLocaleString("ar-EG") + (unit ? ` ${unit}` : "");
//     }

//     return value.toLocaleString() + (unit ? ` ${unit}` : "");
//   };

//   // Initialize positions when slider width is available
//   useEffect(() => {
//     if (sliderWidth > 0 && !isReady) {
//       const leftPos = valueToPosition(minValue);
//       const rightPos = valueToPosition(maxValue);
//       setLeftThumbPosition(leftPos);
//       setRightThumbPosition(rightPos);
//       setIsReady(true);
//     }
//   }, [sliderWidth, minValue, maxValue, min, max, isReady]);

//   // Update positions when values change externally
//   useEffect(() => {
//     if (sliderWidth > 0 && isReady && !dragging) {
//       setLeftThumbPosition(valueToPosition(minValue));
//       setRightThumbPosition(valueToPosition(maxValue));
//     }
//   }, [minValue, maxValue, sliderWidth, isReady, dragging]);

//   const leftThumbPanResponder = PanResponder.create({
//     onStartShouldSetPanResponder: () => isReady,
//     onMoveShouldSetPanResponder: () => isReady,
//     onPanResponderGrant: () => {
//       setDragging("left");
//     },
//     onPanResponderMove: (_, gestureState) => {
//       if (!isReady) return;

//       const startPosition = valueToPosition(minValue);
//       let newPosition = startPosition + gestureState.dx;
//       newPosition = Math.max(0, Math.min(newPosition, rightThumbPosition - 20));
//       setLeftThumbPosition(newPosition);

//       const newValue = positionToValue(newPosition);
//       onValueChange(newValue, maxValue);
//     },
//     onPanResponderRelease: () => {
//       setDragging(null);
//       if (isReady) {
//         const finalValue = positionToValue(leftThumbPosition);
//         onValueChange(finalValue, maxValue);
//       }
//     },
//   });

//   const rightThumbPanResponder = PanResponder.create({
//     onStartShouldSetPanResponder: () => isReady,
//     onMoveShouldSetPanResponder: () => isReady,
//     onPanResponderGrant: () => {
//       setDragging("right");
//     },
//     onPanResponderMove: (_, gestureState) => {
//       if (!isReady) return;

//       const startPosition = valueToPosition(maxValue);
//       let newPosition = startPosition + gestureState.dx;
//       newPosition = Math.min(
//         sliderWidth,
//         Math.max(newPosition, leftThumbPosition + 20)
//       );
//       setRightThumbPosition(newPosition);

//       const newValue = positionToValue(newPosition);
//       onValueChange(minValue, newValue);
//     },
//     onPanResponderRelease: () => {
//       setDragging(null);
//       if (isReady) {
//         const finalValue = positionToValue(rightThumbPosition);
//         onValueChange(minValue, finalValue);
//       }
//     },
//   });

//   const handleLayout = (event: any) => {
//     const { width } = event.nativeEvent.layout;
//     if (width > 0) {
//       setSliderWidth(width - 24);
//     }
//   };

//   // Don't render slider until it's ready
//   if (!isReady || sliderWidth === 0) {
//     return (
//       <View style={styles.container}>
//         {title && (
//           <View style={[styles.titleContainer, rtlViewStyle]}>
//             <Text style={styles.title}>{title}</Text>
//             <Text style={styles.rangeText}>
//               {formatValue(minValue)} -{" "}
//               {maxValue === max ? t("Any") : formatValue(maxValue)}
//             </Text>
//           </View>
//         )}
//         <View style={styles.sliderContainer} onLayout={handleLayout}>
//           <View style={styles.track} />
//         </View>
//         <View style={styles.labelsContainer}>
//           <Text style={styles.label}>{formatValue(min)}</Text>
//           <Text style={styles.label}>{formatValue(max)}</Text>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {title && (
//         <View style={styles.titleContainer}>
//           <Text style={styles.title}>{title}</Text>
//           <Text style={styles.rangeText}>
//             {formatValue(minValue)} -{" "}
//             {maxValue === max ? t("Any") : formatValue(maxValue)}
//           </Text>
//         </View>
//       )}

//       <View style={styles.sliderContainer} onLayout={handleLayout}>
//         <View style={styles.track} />
//         <View
//           style={[
//             styles.range,
//             {
//               left: leftThumbPosition + 12,
//               width: rightThumbPosition - leftThumbPosition,
//             },
//           ]}
//         />

//         <View
//           {...leftThumbPanResponder.panHandlers}
//           style={[
//             styles.thumb,
//             {
//               left: leftThumbPosition,
//               backgroundColor: dragging === "left" ? "#a00000" : "#ffffff",
//               transform: [{ scale: dragging === "left" ? 1.2 : 1 }],
//             },
//           ]}
//         />

//         <View
//           {...rightThumbPanResponder.panHandlers}
//           style={[
//             styles.thumb,
//             {
//               left: rightThumbPosition,
//               backgroundColor: dragging === "right" ? "#a00000" : "#ffffff",
//               transform: [{ scale: dragging === "right" ? 1.2 : 1 }],
//             },
//           ]}
//         />
//       </View>

//       <View style={styles.labelsContainer}>
//         <Text style={styles.label}>{formatValue(min)}</Text>
//         <Text style={styles.label}>{formatValue(max)}</Text>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     paddingHorizontal: 16,
//     marginVertical: 20,
//   },
//   titleContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#333",
//   },
//   rangeText: {
//     fontSize: 16,
//     color: "#b80200",
//     fontWeight: "500",
//   },
//   sliderContainer: {
//     height: 40,
//     position: "relative",
//     justifyContent: "center",
//     marginHorizontal: 12,
//   },
//   track: {
//     height: 4,
//     backgroundColor: "#e0e0e0",
//     borderRadius: 2,
//     position: "absolute",
//     left: 0,
//     right: 0,
//   },
//   range: {
//     height: 4,
//     backgroundColor: "#b80200",
//     borderRadius: 2,
//     position: "absolute",
//   },
//   thumb: {
//     width: 30,
//     height: 30,
//     borderRadius: 12,
//     backgroundColor: "#ffffff",
//     position: "absolute",
//     top: 8,
//     marginLeft: -12,
//     borderWidth: 2,
//     borderColor: "#b80200",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 3,
//     elevation: 5,
//   },
//   labelsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 12,
//   },
//   label: {
//     fontSize: 12,
//     color: "#666",
//     textAlign: "center",
//   },
// });

// export default RangeSlider;
