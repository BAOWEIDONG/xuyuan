import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { showImagePreview } from 'vant';
import type { User, WeightRecord, ExerciseRecord, DietRecord, CoachActivityRecord, RewardTier, RewardClaim, MealTimeConfig, MetricConfig } from '../types';
import {
  MOCK_REWARD_TIERS,
  MOCK_REWARD_CLAIMS,
  DEFAULT_MEAL_TIME_CONFIG,
  MOCK_DIET_RECORDS,
  MOCK_WEIGHT_RECORDS,
  MOCK_EXERCISE_RECORDS,
  MOCK_COACH_ACTIVITIES,
  DEFAULT_METRIC_CONFIGS,
  MOCK_STUDENTS,
} from '../mock/data';
import * as api from '../lib/api';

export type View =
  | 'login'
  | 'register'
  | 'questionnaire'
  | 'dashboard'
  | 'upload'
  | 'health-profile'
  | 'exercise'
  | 'diet'
  | 'weight-checkin'
  | 'calendar'
  | 'coach-dashboard'
  | 'activity-upload'
  | 'dietitian-dashboard'
  | 'dietitian-student-detail'
  | 'dietitian-unannotated-list'
  | 'activities-list'
  | 'video-player'
  | 'camp-stats'
  | 'camp-summary'
  | 'camp-report'
  | 'enterprise-report'
  | 'camp-activities'
  | 'personal-journey'
  | 'ranking'
  | 'pointsDetail'
  | 'reward'
  | 'reward-manage'
  | 'reward-config'
  | 'meal-time-config'
  | 'metric-config'
  | 'activity-admin'
  | 'messages';

/** 趣味活动配置（营养师端可切换开关；学员端 CampActivitiesView 按此展示） */
export interface ActivityConfig {
  /** 阶梯减重达标奖 */
  weightMilestone: boolean;
  /** 每周主题挑战 */
  weeklyChallenge: boolean;
  /** 全勤幸运抽奖 */
  luckyDraw: boolean;
}

export const useAppStore = defineStore('app', () => {
  const user = ref<User | null>(null);
  /** 营养师写给学员的结营寄语 { [studentId]: text }（后端可用 PUT /camp/message/:studentId 持久化） */
  const campMessages = ref<Record<string, string>>({
    s1: '坚持下来很不容易，你的自律大家都看在眼里。这段时间养成的饮食和运动习惯是最好的收获，继续保持，健康是一辈子的事！',
  });

  /** 趣味活动开关（营养师端配置，学员端按此展示） */
  const activityConfig = ref<ActivityConfig>({
    weightMilestone: true,
    weeklyChallenge: true,
    luckyDraw: true,
  });

  function updateActivityConfig(updates: Partial<ActivityConfig>) {
    activityConfig.value = { ...activityConfig.value, ...updates };
  }

  function setCampMessage(studentId: string, text: string) {
    if (text.trim()) campMessages.value = { ...campMessages.value, [studentId]: text.trim() };
    else {
      const next = { ...campMessages.value };
      delete next[studentId];
      campMessages.value = next;
    }
  }
  const viewHistory = ref<View[]>(['login']);
  const currentView = computed<View>(() => viewHistory.value[viewHistory.value.length - 1]);

  const questionnaireAnswered = ref(false);
  const students = ref<typeof MOCK_STUDENTS>([...MOCK_STUDENTS]);
  const weightRecords = ref<WeightRecord[]>([...MOCK_WEIGHT_RECORDS]);
  const exerciseRecords = ref<ExerciseRecord[]>([...MOCK_EXERCISE_RECORDS]);
  const dietRecords = ref<DietRecord[]>([...MOCK_DIET_RECORDS]);
  const coachActivities = ref<CoachActivityRecord[]>([...MOCK_COACH_ACTIVITIES]);
  const rewardTiers = ref<RewardTier[]>([...MOCK_REWARD_TIERS]);
  const rewardClaims = ref<RewardClaim[]>([...MOCK_REWARD_CLAIMS]);
  const mealTimeConfig = ref<MealTimeConfig>({ ...DEFAULT_MEAL_TIME_CONFIG });
  const metricConfigs = ref<MetricConfig[]>([...DEFAULT_METRIC_CONFIGS]);

  const selectedStudentId = ref<string | null>(null);
  const selectedActivityId = ref<string | null>(null);
  const selectedDateStr = ref<string | null>(null);

  /** 待批注列表点击跳转时携带的目标记录信息（用于营养师端自动切 Tab + 滚动定位） */
  const pendingRecordType = ref<'diet' | 'weight' | 'exercise' | null>(null);
  const pendingRecordId = ref<string | null>(null);

  function setPendingAnnotation(type: 'diet' | 'weight' | 'exercise' | null, recordId: string | null = null) {
    pendingRecordType.value = type;
    pendingRecordId.value = recordId;
  }

  const videoPreview = ref<{ url: string } | null>(null);

  // 联调加载：USE_MOCK=true 时返回同一份 mock（无副作用）；USE_MOCK=false 时从后端拉取
  async function init() {
    try {
      const [studentList, diet, exercise, weight, activities, tiers, claims, mealCfg, metricCfgs] = await Promise.all([
        api.getStudents(),
        api.getDietRecords(),
        api.getExerciseRecords(),
        api.getWeightRecords(),
        api.getCoachActivities(),
        api.getRewardTiers(),
        api.getRewardClaims(),
        api.getMealTimeConfig(),
        api.getMetricConfigs(),
      ]);
      students.value = studentList;
      dietRecords.value = diet;
      exerciseRecords.value = exercise;
      weightRecords.value = weight;
      coachActivities.value = activities;
      rewardTiers.value = tiers;
      rewardClaims.value = claims;
      mealTimeConfig.value = mealCfg;
      metricConfigs.value = metricCfgs;
    } catch (e) {
      // 联调失败保留 mock 初值
    }
  }

  function setUser(u: User | null) {
    user.value = u;
    if (u) {
      // 持久化登录态到 localStorage，实现保活
      const authData = {
        user: u,
        timestamp: Date.now(),
      };
      localStorage.setItem('camp_auth', JSON.stringify(authData));
    } else {
      localStorage.removeItem('camp_auth');
    }
  }

  /** 从 localStorage 恢复登录态（页面刷新/重新打开时自动登录） */
  function restoreAuth(): boolean {
    try {
      const raw = localStorage.getItem('camp_auth');
      if (!raw) return false;
      const data = JSON.parse(raw);
      // 30 天过期
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp > maxAge) {
        localStorage.removeItem('camp_auth');
        return false;
      }
      if (data.user && data.user.role) {
        user.value = data.user;
        // 恢复问卷状态
        const qSaved = localStorage.getItem('submitted_questionnaire');
        questionnaireAnswered.value = !!qSaved;
        // 根据角色和问卷状态跳转到对应首页
        if (data.user.role === 'coach') {
          viewHistory.value = ['coach-dashboard'];
        } else if (data.user.role === 'dietitian') {
          viewHistory.value = ['dietitian-dashboard'];
        } else {
          // 学员：已填问卷 -> 首页，未填 -> 问卷页
          viewHistory.value = [qSaved ? 'dashboard' : 'questionnaire'];
        }
        return true;
      }
    } catch (e) {
      // JSON 解析失败，清除无效数据
      localStorage.removeItem('camp_auth');
    }
    return false;
  }

  /** 退出登录 */
  function logout() {
    user.value = null;
    localStorage.removeItem('camp_auth');
    viewHistory.value = ['login'];
  }

  function setCurrentView(view: View) {
    if (viewHistory.value[viewHistory.value.length - 1] === view) return;
    viewHistory.value.push(view);
  }

  function goBack() {
    if (viewHistory.value.length > 1) viewHistory.value.pop();
  }

  function setQuestionnaireAnswered(v: boolean) {
    questionnaireAnswered.value = v;
  }

  function addWeightRecord(record: WeightRecord) {
    weightRecords.value.push(record);
    api.createWeightRecord(record).catch(() => {});
  }

  /** 更新体重记录（营养师批注使用） */
  function updateWeightRecord(id: string, updates: Partial<WeightRecord>) {
    weightRecords.value = weightRecords.value.map((r) => (r.id === id ? { ...r, ...updates } : r));
    api.updateWeightRecord(id, updates).catch(() => {});
  }

  function addExerciseRecord(record: ExerciseRecord) {
    exerciseRecords.value.push(record);
    api.createExerciseRecord(record).catch(() => {});
  }

  /** 更新运动记录（营养师批注使用） */
  function updateExerciseRecord(id: string, updates: Partial<ExerciseRecord>) {
    exerciseRecords.value = exerciseRecords.value.map((r) => (r.id === id ? { ...r, ...updates } : r));
    api.updateExerciseRecord(id, updates).catch(() => {});
  }

  function addDietRecord(record: DietRecord) {
    dietRecords.value.push(record);
    api.createDietRecord(record).catch(() => {});
  }

  function updateDietRecord(id: string, updates: Partial<DietRecord>) {
    dietRecords.value = dietRecords.value.map((r) => (r.id === id ? { ...r, ...updates } : r));
    api.updateDietRecord(id, updates).catch(() => {});
  }

  function addCoachActivity(record: CoachActivityRecord) {
    coachActivities.value.push(record);
    api.createCoachActivity(record).catch(() => {});
  }

  function setSelectedStudentId(id: string | null) {
    selectedStudentId.value = id;
  }

  function setSelectedActivityId(id: string | null) {
    selectedActivityId.value = id;
  }

  function setSelectedDateStr(date: string | null) {
    selectedDateStr.value = date;
  }

  function openImagePreview(urls: string[], index: number = 0) {
    if (urls.length > 0) {
      showImagePreview({ images: urls, startPosition: index, closeable: true });
    }
  }

  function openVideoPreview(url: string) {
    videoPreview.value = { url };
  }

  function addRewardTier(tier: RewardTier) {
    rewardTiers.value.push(tier);
    api.createRewardTier(tier).catch(() => {});
  }

  function updateRewardTier(id: string, updates: Partial<RewardTier>) {
    rewardTiers.value = rewardTiers.value.map((t) => (t.id === id ? { ...t, ...updates } : t));
    api.updateRewardTier(id, updates).catch(() => {});
  }

  function deleteRewardTier(id: string) {
    rewardTiers.value = rewardTiers.value.filter((t) => t.id !== id);
    api.deleteRewardTier(id).catch(() => {});
  }

  function addRewardClaim(claim: RewardClaim) {
    rewardClaims.value.push(claim);
    api.createRewardClaim(claim).catch(() => {});
  }

  function updateRewardClaim(id: string, updates: Partial<RewardClaim>) {
    rewardClaims.value = rewardClaims.value.map((c) => (c.id === id ? { ...c, ...updates } : c));
    api.updateRewardClaim(id, updates).catch(() => {});
  }

  function updateMealTimeConfig(config: MealTimeConfig) {
    mealTimeConfig.value = { ...config };
    api.updateMealTimeConfigApi(config).catch(() => {});
  }

  function addMetricConfig(config: MetricConfig) {
    metricConfigs.value.push(config);
    api.createMetricConfig(config).catch(() => {});
  }

  function updateMetricConfig(id: string, updates: Partial<MetricConfig>) {
    metricConfigs.value = metricConfigs.value.map((c) => (c.id === id ? { ...c, ...updates } : c));
    api.updateMetricConfig(id, updates).catch(() => {});
  }

  function deleteMetricConfig(id: string) {
    metricConfigs.value = metricConfigs.value.filter((c) => c.id !== id);
    api.deleteMetricConfig(id).catch(() => {});
  }

  function closeVideoPreview() {
    videoPreview.value = null;
  }

  return {
    user,
    campMessages,
    setCampMessage,
    activityConfig,
    updateActivityConfig,
    viewHistory,
    currentView,
    init,
    questionnaireAnswered,
    students,
    weightRecords,
    exerciseRecords,
    dietRecords,
    coachActivities,
    selectedStudentId,
    selectedActivityId,
    selectedDateStr,
    pendingRecordType,
    pendingRecordId,
    setPendingAnnotation,
    videoPreview,
    setUser,
    restoreAuth,
    logout,
    setCurrentView,
    goBack,
    setQuestionnaireAnswered,
    addWeightRecord,
    updateWeightRecord,
    addExerciseRecord,
    updateExerciseRecord,
    addDietRecord,
    updateDietRecord,
    addCoachActivity,
    setSelectedStudentId,
    setSelectedActivityId,
    setSelectedDateStr,
    rewardTiers,
    rewardClaims,
    addRewardTier,
    updateRewardTier,
    deleteRewardTier,
    addRewardClaim,
    updateRewardClaim,
    mealTimeConfig,
    updateMealTimeConfig,
    metricConfigs,
    addMetricConfig,
    updateMetricConfig,
    deleteMetricConfig,
    openImagePreview,
    openVideoPreview,
    closeVideoPreview,
  };
});
