export function calcBMR(weight: number, height: number, age: number, gender: 'male' | 'female', bodyFat?: number): { bmr: number, isKatch: boolean } {
  const w = weight || 0;
  const h = height || 0;
  const a = age || 0;
  
  if (bodyFat && bodyFat > 0) {
    // Katch-McArdle Formula
    const lbm = w * (100 - bodyFat) / 100;
    return { bmr: 370 + (21.6 * lbm), isKatch: true };
  }
  
  // Mifflin-St Jeor Equation
  if (gender === 'male' || gender?.toString().toLowerCase() === 'male') {
    return { bmr: (10 * w) + (6.25 * h) - (5 * a) + 5, isKatch: false };
  } else {
    return { bmr: (10 * w) + (6.25 * h) - (5 * a) - 161, isKatch: false };
  }
}

export function calcActivityMultiplier(activityLevel: string): number {
  if (!activityLevel) return 1.2;
  const level = activityLevel.toLowerCase();
  if (level.includes('sedentary')) return 1.2;
  if (level.includes('light')) return 1.375;
  if (level.includes('moderate')) return 1.55;
  if (level.includes('very active') || level.includes('heavy')) return 1.725;
  if (level.includes('extra active') || level.includes('athlete')) return 1.9;
  return 1.2;
}

export function calcNutritionStats(
  weight: number, 
  height: number, 
  age: number, 
  gender: 'male' | 'female', 
  activityLevel: string, 
  primaryGoal: string,
  bodyFat?: number
) {
  const bmrResult = calcBMR(weight, height, age, gender, bodyFat);
  const bmr = bmrResult.bmr;
  const isKatch = bmrResult.isKatch;
  
  const multiplier = calcActivityMultiplier(activityLevel);
  let tdee = bmr * multiplier;

  // Adjust TDEE based on goal
  const goal = (primaryGoal || '').toLowerCase();
  let targetKcal = tdee;
  
  if (goal.includes('lose') || goal.includes('cut')) {
    targetKcal -= 500; // 500 kcal deficit
  } else if (goal.includes('muscle') || goal.includes('gain') || goal.includes('bulk')) {
    targetKcal += 300; // 300 kcal surplus
  }

  // Macro distribution based on original Nutrition.tsx logic:
  // pro = weight * 2, fat = weight * 1, carb = rest
  const targetPro = Math.round(weight * 2.0);
  const targetFat = Math.round(weight * 1.0);
  const targetCarbs = Math.round((targetKcal - (targetPro * 4) - (targetFat * 9)) / 4);

  return {
    bmr: Math.round(bmr),
    isKatch,
    tdee: Math.round(tdee),
    targetKcal: Math.round(targetKcal),
    targetPro,
    targetCarbs,
    targetFat,
  };
}
