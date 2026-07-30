export type Role = 'student' | 'coach' | 'dietitian';

export interface MedicalReport {
  url: string;
  type: 'image' | 'pdf';
  name?: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  weight?: number;
  /** 目标体重（学员在体重打卡页可设置） */
  targetWeight?: number;
  medicalHistory?: string;
  allergies?: string;
  medicalReports?: MedicalReport[];
}

export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD HH:mm:ss
  weight: number;
  studentId?: string; // 用于多学员数据过滤（营养师端）
  /** 打卡照片 */
  photos?: string[];
  /** 营养师对该条体重记录的批注 */
  dietitianComment?: string;
  /** 批注营养师姓名 */
  dietitianName?: string;
  /** 批注时间 yyyy-MM-dd HH:mm:ss */
  dietitianCommentDate?: string;
  /** 学员对批注的反馈：收到 / 有用 */
  studentFeedback?: 'received' | 'helpful';
  /** 学员是否已读该批注 */
  commentRead?: boolean;
}

export interface ExerciseRecord {
  id: string;
  studentId?: string;
  date: string;
  type: string;
  duration: number;
  intensity: number;
  notes?: string;
  photos?: string[];
  /** 运动视频 URL 列表 */
  videoUrls?: string[];
  /** 营养师对该条运动记录的批注 */
  dietitianComment?: string;
  dietitianName?: string;
  dietitianCommentDate?: string;
  /** 学员对批注的反馈：收到 / 有用 */
  studentFeedback?: 'received' | 'helpful';
  /** 学员是否已读该批注 */
  commentRead?: boolean;
  /** 营养师对该条运动记录的评分：0=未达标 / 1=尚可 / 2=到位 */
  dietitianScore?: 0 | 1 | 2 | null;
}

export interface DietRecord {
  id: string;
  studentId?: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  photos: string[];
  dietitianComment?: string;
  dietitianName?: string;
  dietitianCommentDate?: string;
  isFasted?: boolean;
  dietitianScore?: 0 | 1 | 2 | null;
  /** 学员对批注的反馈：收到 / 有用 */
  studentFeedback?: 'received' | 'helpful';
  /** 学员是否已读该批注 */
  commentRead?: boolean;
  /** 餐次结构标签（学员打卡时一键勾选） */
  hasStaple?: boolean;    // 有主食
  hasProtein?: boolean;   // 有蛋白质
  hasVegetable?: boolean; // 有蔬菜
}

export interface CoachActivityRecord {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  coachName: string;
  date: string;
  videoUrls?: string[];
}

// Reward types
export interface RewardTier {
  id: string;
  name: string;
  requiredDays: number;
  imageUrl: string;
  stock: number;
  description?: string;
  /** 奖品来源：streak=连续打卡奖励 / activity=趣味活动奖品 */
  source?: 'streak' | 'activity';
  /** 关联的趣味活动类型（source=activity 时有效）：milestone=阶梯减重 / weekly=每周挑战 / lucky=全勤抽奖 */
  activityType?: 'milestone' | 'weekly' | 'lucky';
}

export interface RewardClaim {
  id: string;
  tierId: string;
  studentId: string;
  studentName: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  claimDate: string;
  /**
   * 奖励状态流转：
   *   confirmed -> 营养师已审核通过（仅活动奖励），等待学员领取
   *   pending   -> 学员已领取（填了地址/选了方式），等待营养师发货
   *   shipped   -> 已发货（有快递单号）
   *   in-person -> 已线下发放
   */
  status: 'confirmed' | 'pending' | 'shipped' | 'in-person';
  trackingNumber?: string;
  shipDate?: string;
  /** 线下发放时间（status=in-person 时有效） */
  deliveredAt?: string;
  /** 学员选择的领取方式 */
  deliveryMethod?: 'shipped' | 'in-person';
  /** 关联活动类型（仅活动奖励） */
  activityType?: 'milestone' | 'weekly' | 'lucky';
}

// Meal time configuration
export interface MealTimeSlot {
  start: string;  // "07:00"
  end: string;    // "09:00"
  enabled: boolean;
}

export interface MealTimeConfig {
  breakfast: MealTimeSlot;
  lunch: MealTimeSlot;
  dinner: MealTimeSlot;
  snack: MealTimeSlot;
}

// Health metric configuration (dynamic, configurable by dietitian)
export interface MetricConfig {
  id: string;
  name: string;          // 指标名称
  unit: string;          // 单位
  normalRange?: string;  // 参考区间（非必填）
  category: string;      // 分类（如"身体测量数据"、"血糖相关"）
}

// ============================================================================
//  结营报告 & 统计类型 (Camp Report & Summary Types)
// ============================================================================

/** 单个指标的前后变化 */
export interface MetricChange {
  configId: string;
  name: string;
  unit: string;
  category: string;
  normalRange: string;
  beforeValue: number | string | null;
  afterValue: number | string | null;
  /** 变化量 = after - before（仅数值型有值） */
  change: number | null;
  /** 变化百分比 = change / before * 100 */
  changePercent: number | null;
  /** 是否改善（按指标方向判断） */
  isImproved: boolean;
  /** 开营前是否异常 */
  beforeAbnormal: boolean;
  /** 结营后是否异常 */
  afterAbnormal: boolean;
  /** 异常转正常 */
  turnedNormal: boolean;
}

/** 打卡频率统计 */
export interface CheckinStats {
  /** 训练营总天数 */
  campDays: number;
  /** 有任意打卡记录的天数（含部分打卡） */
  totalCheckinDays: number;
  /** 完成全部打卡的天数（三餐+运动） */
  completeDays: number;
  /** 完成率 = completeDays / campDays */
  completionRate: number;
  /** 有饮食打卡的天数 */
  dietCheckinDays: number;
  /** 有运动打卡的天数 */
  exerciseCheckinDays: number;
  /** 有体重打卡的天数 */
  weightCheckinDays: number;
  /** 饮食打卡总条数 */
  totalDietRecords: number;
  /** 运动打卡总条数 */
  totalExerciseRecords: number;
  /** 体重打卡总条数 */
  totalWeightRecords: number;
  /** 当前连续打卡天数 */
  currentStreak: number;
  /** 最长连续打卡天数（整个营期内） */
  longestStreak: number;
  /** 总运动时长（分钟） */
  totalExerciseDuration: number;
  /** 饮食总得分（每日封顶3分） */
  totalDietScore: number;
}

/** 体重趋势 */
export interface WeightTrend {
  /** 体重记录列表（按日期排序） */
  records: { date: string; weight: number }[];
  /** 初始体重 */
  startWeight: number | null;
  /** 最终体重 */
  endWeight: number | null;
  /** 体重变化 = end - start */
  totalChange: number | null;
  /** 体重变化百分比 */
  changePercent: number | null;
  /** 趋势方向 */
  trend: 'decreasing' | 'increasing' | 'stable' | 'insufficient';
}

/** 成就 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;           // emoji
  unlocked: boolean;
  /** 解锁日期（yyyy-MM-dd） */
  unlockedDate?: string;
}

/** 学员结营报告 */
export interface StudentCampReport {
  studentId: string;
  studentName: string;
  gender: 'male' | 'female' | undefined;
  campDays: number;
  /** 打卡统计 */
  checkinStats: CheckinStats;
  /** 体重趋势 */
  weightTrend: WeightTrend;
  /** 全部指标变化 */
  metricChanges: MetricChange[];
  /** 成就列表 */
  achievements: Achievement[];
  /** 核心摘要 */
  summary: {
    weightLossKg: number | null;       // 体重减少量（正数=减了，负数=增了）
    weightLossPercent: number | null;
    bodyFatLossKg: number | null;      // 脂肪减少量
    muscleChangeKg: number | null;     // 肌肉变化量
    visceralFatChange: number | null;  // 内脏脂肪变化
    abnormalCountBefore: number;       // 开营前异常指标数
    abnormalCountAfter: number;        // 结营后异常指标数
    abnormalImprovedCount: number;     // 异常转正常数
    totalCheckinDays: number;
    completionRate: number;
    longestStreak: number;
    totalExerciseDuration: number;
    totalDietScore: number;
  };
}

/** 营养师端结营统计（聚合） */
export interface DietitianCampSummary {
  totalStudents: number;
  /** 有效人数（有前后体成分检测数据的学员） */
  validStudentCount: number;
  campDays: number;
  /** 平均体重变化（基于有效人数） */
  avgWeightChange: number | null;
  /** 平均完成率（基于有效人数） */
  avgCompletionRate: number | null;
  /** 平均打卡天数（基于有效人数） */
  avgCheckinDays: number | null;
  /** 平均异常改善数（基于有效人数） */
  avgAbnormalImproved: number | null;
  /** 每位学员的报告 */
  studentReports: StudentCampReport[];
  /** 指标聚合统计 */
  metricAggregates: MetricAggregate[];
}

/** 企业汇报版报告（仅匿名聚合数据，无个人健康明细，可直接发 HR） */
export interface EnterpriseCampReport {
  /** 参营总人数 */
  totalStudents: number;
  /** 有效人数（有前后体成分数据） */
  validStudentCount: number;
  campDays: number;
  /** 平均打卡完成率（0~1，基于有效人数） */
  avgCompletionRate: number | null;
  /** 完成率 ≥80% 的人数及占比 */
  highCompletionCount: number;
  highCompletionRate: number | null;
  /** 平均减重 kg（正数=减了，基于有效人数） */
  avgWeightLoss: number | null;
  /** 减重 ≥3kg 的人数及占比（基于有体重记录者） */
  weightGoalCount: number;
  weightGoalRate: number | null;
  /** 减重总人数 / 有体重记录人数 */
  weightLossCount: number;
  weightRecordCount: number;
  /** 累计打卡人次（三类打卡记录总数） */
  totalCheckinRecords: number;
  /** 累计运动总时长（分钟，全体学员） */
  totalExerciseMinutes: number;
  /** 异常指标恢复正常：总项次数（全体学员 turnedNormal 之和） */
  abnormalImprovedTotal: number;
  /** 改善率最高的指标 Top N（按 improvementRate 降序，过滤样本过少的） */
  topImprovedMetrics: Array<{
    name: string;
    unit: string;
    avgChange: number | null;
    improvementRate: number | null;
  }>;
  /** 自动提炼的本期亮点（2~4 条，可直接放进汇报 PPT） */
  highlights: string[];
}

/** 指标聚合统计 */
export interface MetricAggregate {
  configId: string;
  name: string;
  unit: string;
  category: string;
  /** 平均开营前值 */
  avgBefore: number | null;
  /** 平均结营后值 */
  avgAfter: number | null;
  /** 平均变化量 */
  avgChange: number | null;
  /** 改善人数 */
  improvedCount: number;
  /** 有数据的人数 */
  totalCount: number;
  /** 改善率 */
  improvementRate: number | null;
}
