<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, type Component } from 'vue';
import { useAppStore } from './store/app';
import LoginView from './components/LoginView.vue';
import RegisterView from './components/RegisterView.vue';
import QuestionnaireView from './components/QuestionnaireView.vue';
import UploadView from './components/UploadView.vue';
import StudentDashboardView from './components/StudentDashboardView.vue';
import HealthProfileView from './components/HealthProfileView.vue';
import ExerciseView from './components/ExerciseView.vue';
import DietView from './components/DietView.vue';
import CalendarView from './components/CalendarView.vue';
import CoachDashboardView from './components/CoachDashboardView.vue';
import WeightCheckinView from './components/WeightCheckinView.vue';
import ActivitiesListView from './components/ActivitiesListView.vue';
import ActivityUploadView from './components/ActivityUploadView.vue';
import DietitianDashboardView from './components/DietitianDashboardView.vue';
import DietitianStudentDetailView from './components/DietitianStudentDetailView.vue';
import DietitianUnannotatedListView from './components/DietitianUnannotatedListView.vue';
import CampStatsView from './components/CampStatsView.vue';
import RankingView from './components/RankingView.vue';
import PointsDetailView from './components/PointsDetailView.vue';
import RewardView from './components/RewardView.vue';
import RewardManageView from './components/RewardManageView.vue';
import RewardConfigView from './components/RewardConfigView.vue';
import MealTimeConfigView from './components/MealTimeConfigView.vue';
import MetricConfigView from './components/MetricConfigView.vue';
import DietitianCampSummaryView from './components/DietitianCampSummaryView.vue';
import EnterpriseReportView from './components/EnterpriseReportView.vue';
import CampReportView from './components/CampReportView.vue';
import CampActivitiesView from './components/CampActivitiesView.vue';
import ActivityAdminView from './components/ActivityAdminView.vue';
import PersonalJourneyView from './components/PersonalJourneyView.vue';
import MessagesView from './components/MessagesView.vue';
import VideoPreview from './components/VideoPreview.vue';

const store = useAppStore();

const viewMap: Record<string, Component> = {
  login: LoginView,
  register: RegisterView,
  questionnaire: QuestionnaireView,
  upload: UploadView,
  dashboard: StudentDashboardView,
  'health-profile': HealthProfileView,
  exercise: ExerciseView,
  diet: DietView,
  'weight-checkin': WeightCheckinView,
  calendar: CalendarView,
  'coach-dashboard': CoachDashboardView,
  'activity-upload': ActivityUploadView,
  'activities-list': ActivitiesListView,
  'dietitian-dashboard': DietitianDashboardView,
  'dietitian-student-detail': DietitianStudentDetailView,
  'dietitian-unannotated-list': DietitianUnannotatedListView,
  'camp-stats': CampStatsView,
  ranking: RankingView,
  pointsDetail: PointsDetailView,
  reward: RewardView,
  'reward-manage': RewardManageView,
  'reward-config': RewardConfigView,
  'meal-time-config': MealTimeConfigView,
  'metric-config': MetricConfigView,
  'camp-summary': DietitianCampSummaryView,
  'enterprise-report': EnterpriseReportView,
  'camp-report': CampReportView,
  'camp-activities': CampActivitiesView,
  'activity-admin': ActivityAdminView,
  'personal-journey': PersonalJourneyView,
  messages: MessagesView,
};

const currentComponent = computed<Component>(() => viewMap[store.currentView] || LoginView);

// 视图切换时滚动到顶部
const scrollContainer = ref<HTMLElement | null>(null);
watch(() => store.currentView, () => {
  nextTick(() => {
    scrollContainer.value?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  });
});

onMounted(() => {
  // 先尝试恢复登录态（保活），再加载数据
  store.restoreAuth();
  store.init();
});
</script>

<template>
  <div class="fixed inset-0 max-w-md mx-auto overflow-hidden bg-[#F7F8FA] font-sans text-gray-700 sm:shadow-2xl sm:border-x sm:border-gray-100">
    <div ref="scrollContainer" class="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain" style="-webkit-overflow-scrolling: touch; touch-action: pan-y;">
      <transition name="view-fade" mode="out-in">
        <component :is="currentComponent" :key="store.currentView" />
      </transition>
    </div>
    <VideoPreview />
  </div>
</template>

<style>
.view-fade-enter-active, .view-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.view-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
