export function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female' = 'male'): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

export const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export type ActivityLevel = keyof typeof activityMultipliers;
export type Goal = 'lose' | 'maintain' | 'gain';

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * activityMultipliers[activityLevel];
}

export function calculateMacros(tdee: number, goal: Goal) {
  let targetCalories = tdee;
  if (goal === 'lose') targetCalories -= 500;
  if (goal === 'gain') targetCalories += 500;

  // Generic split: 30% Protein, 40% Carbs, 30% Fat
  const protein = Math.round((targetCalories * 0.3) / 4);
  const carbs = Math.round((targetCalories * 0.4) / 4);
  const fat = Math.round((targetCalories * 0.3) / 9);

  return { calories: Math.round(targetCalories), protein, carbs, fat };
}
