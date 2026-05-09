import { useStore } from '../lib/store';
import { calcNutritionStats } from '../lib/nutritionUtils';

export function useNutritionStats() {
  const { profile, nutritionDiary, waterIntake, stravaCalories } = useStore();

  // 1. Calculate targets
  let targetKcal = 2000;
  let targetPro = 150;
  let targetCarbs = 200;
  let targetFat = 65;
  let waterTarget = 3; // L

  if (profile && profile.weight && profile.height && profile.age && profile.gender) {
    const stats = calcNutritionStats(
      profile.weight,
      profile.height,
      profile.age,
      profile.gender,
      profile.activityLevel || '',
      profile.primaryGoal || '',
      profile.bodyFat
    );
    targetKcal = stats.targetKcal;
    targetPro = stats.targetPro;
    targetCarbs = stats.targetCarbs;
    targetFat = stats.targetFat;
    // Better water guideline calculation
    let baseWater = (profile.weight * 35) / 1000; // 35ml per kg baseline
    const activityBonus: Record<string, number> = {
      'Sedentary': 0,
      'Lightly Active': 0.3,
      'Moderately Active': 0.5,
      'Very Active': 0.8,
    };
    baseWater += activityBonus[profile.activityLevel || ''] ?? 0;
    if (stravaCalories > 0) baseWater += Math.round((stravaCalories / 500) * 0.5 * 10) / 10;
    waterTarget = Math.round(baseWater * 10) / 10;
  }

  // Add Strava active calories to the total daily energy budget
  const adjustedTargetKcal = targetKcal + Math.round(stravaCalories || 0);

  // 2. Calculate consumed
  const consumedKcal = nutritionDiary.reduce((sum, item) => sum + item.kcal, 0);
  const consumedPro = nutritionDiary.reduce((sum, item) => sum + item.protein, 0);
  const consumedCarbs = nutritionDiary.reduce((sum, item) => sum + item.carbs, 0);
  const consumedFat = nutritionDiary.reduce((sum, item) => sum + item.fat, 0);

  const remainingKcal = Math.max(0, adjustedTargetKcal - consumedKcal);
  const remainingPro = Math.max(0, targetPro - consumedPro);
  const remainingCarbs = Math.max(0, targetCarbs - consumedCarbs);
  const remainingFat = Math.max(0, targetFat - consumedFat);

  return {
    targetKcal: adjustedTargetKcal,
    baseTargetKcal: targetKcal,
    targetPro,
    targetCarbs,
    targetFat,
    waterTarget,
    consumedKcal,
    consumedPro,
    consumedCarbs,
    consumedFat,
    remainingKcal,
    remainingPro,
    remainingCarbs,
    remainingFat,
    waterIntake,
  };
}
