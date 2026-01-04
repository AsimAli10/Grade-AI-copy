/**
 * Calculate BMI (Body Mass Index)
 * @param weightKg Weight in kilograms
 * @param heightCm Height in centimeters
 * @returns BMI value or null if invalid inputs
 */
export function calculateBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}

/**
 * Get BMI category
 * @param bmi BMI value
 * @returns Category string and color
 */
export function getBMICategory(bmi: number | null): {
  category: string;
  color: string;
  description: string;
} {
  if (!bmi) {
    return {
      category: "Unknown",
      color: "muted",
      description: "BMI cannot be calculated",
    };
  }

  if (bmi < 18.5) {
    return {
      category: "Underweight",
      color: "blue",
      description: "Consider consulting a healthcare provider",
    };
  } else if (bmi < 25) {
    return {
      category: "Normal",
      color: "green",
      description: "Healthy weight range",
    };
  } else if (bmi < 30) {
    return {
      category: "Overweight",
      color: "orange",
      description: "Consider weight management strategies",
    };
  } else {
    return {
      category: "Obese",
      color: "red",
      description: "Consider consulting a healthcare provider",
    };
  }
}

/**
 * Calculate ideal BMI range
 * @param heightCm Height in centimeters
 * @returns Ideal weight range in kg
 */
export function getIdealWeightRange(heightCm: number | null): {
  min: number;
  max: number;
} | null {
  if (!heightCm || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  // Ideal BMI range is 18.5 to 24.9
  const minWeight = 18.5 * heightM * heightM;
  const maxWeight = 24.9 * heightM * heightM;

  return {
    min: Math.round(minWeight * 10) / 10,
    max: Math.round(maxWeight * 10) / 10,
  };
}

/**
 * Get goal-based recommendations
 */
export function getGoalRecommendations(
  goal: string | null,
  bmi: number | null,
  currentWeight: number | null
): {
  title: string;
  recommendations: string[];
  focusNutrients: string[];
} {
  const bmiCategory = getBMICategory(bmi);

  switch (goal) {
    case "weight_loss":
      return {
        title: "Weight Loss Focus",
        recommendations: [
          bmiCategory.category === "Overweight" || bmiCategory.category === "Obese"
            ? "Reduce fat intake and focus on lean proteins"
            : "Maintain a moderate calorie deficit with balanced nutrition",
          "Prioritize high-fiber foods to feel fuller longer",
          "Choose whole grains over refined carbohydrates",
          "Include regular physical activity to support your goals",
        ],
        focusNutrients: ["calories", "fat", "fiber", "protein"],
      };

    case "weight_gain":
      return {
        title: "Weight Gain Focus",
        recommendations: [
          "Increase calorie intake with nutrient-dense foods",
          "Focus on healthy fats and complex carbohydrates",
          "Include protein-rich foods to support muscle mass",
          "Consider smaller, more frequent meals",
        ],
        focusNutrients: ["calories", "protein", "carbohydrates", "fat"],
      };

    case "build_muscle":
      return {
        title: "Muscle Building Focus",
        recommendations: [
          "Prioritize high-quality protein sources",
          "Ensure adequate calorie intake for muscle growth",
          "Include complex carbohydrates for energy",
          "Maintain a slight calorie surplus with regular strength training",
        ],
        focusNutrients: ["protein", "calories", "carbohydrates"],
      };

    case "maintain_weight":
      return {
        title: "Weight Maintenance Focus",
        recommendations: [
          "Maintain balanced macronutrient intake",
          "Focus on whole, unprocessed foods",
          "Monitor portion sizes to match your activity level",
          "Stay consistent with your eating patterns",
        ],
        focusNutrients: ["calories", "protein", "carbohydrates", "fat"],
      };

    case "improve_fitness":
      return {
        title: "Fitness Improvement Focus",
        recommendations: [
          "Balance macronutrients to support active lifestyle",
          "Prioritize complex carbohydrates for sustained energy",
          "Include adequate protein for muscle recovery",
          "Stay hydrated and maintain electrolyte balance",
        ],
        focusNutrients: ["carbohydrates", "protein", "calories"],
      };

    default:
      return {
        title: "General Health Focus",
        recommendations: [
          "Maintain a balanced diet with variety",
          "Focus on whole, nutrient-dense foods",
          "Monitor portion sizes",
          "Stay active and hydrated",
        ],
        focusNutrients: ["calories", "protein", "fiber"],
      };
  }
}

