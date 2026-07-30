/**
 * ============================================================================
 *  API 层 — 前后端接口契约
 * ============================================================================
 *
 *  联调方式:
 *    USE_MOCK = true  → 使用本地 mock 数据，原型可独立运行（无需后端）
 *    USE_MOCK = false → 发起真实 HTTP 请求到 API_BASE
 *
 *  约定:
 *    - 所有日期字符串格式: "yyyy-MM-dd"（日期）或 "yyyy-MM-dd HH:mm:ss"（日期时间）
 *    - 所有接口返回 JSON
 *    - 错误时 HTTP 状态码非 2xx，前端 catch 后保留本地状态
 *
 *  业务规则索引:
 *    - 当天打卡完成定义 → streak.ts → isDayComplete()
 *    - 连续打卡天数计算   → streak.ts → calculateStreak()
 *    - 奖励解锁/领取判定 → streak.ts → getProjectedRewardDates()
 *    - 饮食/运动积分计算  → scoring.ts → calculateDietScore() / calculateExerciseScore()
 *    - 学员排名           → scoring.ts → rankStudents()
 * ============================================================================
 */

import type {
  User,
  WeightRecord,
  ExerciseRecord,
  DietRecord,
  CoachActivityRecord,
  RewardTier,
  RewardClaim,
  MealTimeConfig,
  MetricConfig,
} from '../types';
import type { MetricValue } from './medicalData';
import {
  MOCK_STUDENTS,
  MOCK_DIET_RECORDS,
  MOCK_WEIGHT_RECORDS,
  MOCK_EXERCISE_RECORDS,
  MOCK_COACH_ACTIVITIES,
  MOCK_REWARD_TIERS,
  MOCK_REWARD_CLAIMS,
  DEFAULT_MEAL_TIME_CONFIG,
  DEFAULT_METRIC_CONFIGS,
  MOCK_METRIC_VALUES,
  MOCK_STUDENT_METRIC_VALUES,
} from '../mock/data';

// ============ 联调配置 ============
export const API_BASE = '/api';
export const USE_MOCK = true;

/** 通用请求封装（USE_MOCK=false 时实际发起请求） */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ============ 鉴权 ============

/**
 * 用户登录（手机号 + 验证码）
 * POST /auth/login
 *
 * @body  { phone: string, code: string, role: 'student'|'coach'|'dietitian' }
 * @returns User — 包含 id, role, name, phone
 */
export async function login(phone: string, code: string, role: User['role']): Promise<User> {
  if (USE_MOCK) {
    return {
      id: role === 'student' ? 's1' : `usr_${Date.now()}`,
      role,
      name: role === 'student' ? '李明' : role === 'coach' ? '李教练' : '王营养师',
      phone,
    };
  }
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, code, role }),
  });
}

// ============ 学员列表 ============

/**
 * 获取营期所有学员列表（用于排行榜、营养师批注等）
 * GET /students
 *
 * @returns Array<{ id, name, age, gender, phone }>
 */
export async function getStudents(): Promise<typeof MOCK_STUDENTS> {
  if (USE_MOCK) return MOCK_STUDENTS;
  return request<typeof MOCK_STUDENTS>('/students');
}

// ============ 饮食打卡 ============

/**
 * 获取当前用户所有饮食打卡记录
 * GET /diet-records?studentId={userId}
 *
 * @returns DietRecord[] — 按 date 升序
 *
 * 业务规则: 一条记录对应一餐（breakfast/lunch/dinner/snack）。
 *           同一天三餐 + 运动全部打卡才算"完成当天"。
 */
export async function getDietRecords(): Promise<DietRecord[]> {
  if (USE_MOCK) return MOCK_DIET_RECORDS;
  return request<DietRecord[]>('/diet-records');
}

/**
 * 创建饮食打卡记录
 * POST /diet-records
 *
 * @body  DietRecord（id 由后端生成）
 * @returns DietRecord（含后端生成的 id）
 */
export async function createDietRecord(record: DietRecord): Promise<DietRecord> {
  if (USE_MOCK) return record;
  return request<DietRecord>('/diet-records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

/**
 * 更新饮食打卡记录（营养师批注/打分）
 * PATCH /diet-records/:id
 *
 * @body  Partial<DietRecord> — 通常只传 dietitianComment, dietitianScore
 * @returns DietRecord — 更新后的完整记录
 */
export async function updateDietRecord(id: string, updates: Partial<DietRecord>): Promise<DietRecord> {
  if (USE_MOCK) return { id, ...updates } as DietRecord;
  return request<DietRecord>(`/diet-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============ 运动打卡 ============

/**
 * 获取当前用户所有运动打卡记录
 * GET /exercise-records?studentId={userId}
 *
 * @returns ExerciseRecord[] — 按 date 升序
 *
 * 业务规则: 运动打卡是"完成当天"的必要条件之一。
 *           积分规则: duration >= 40 分钟记 1 分，否则 0 分。
 */
export async function getExerciseRecords(): Promise<ExerciseRecord[]> {
  if (USE_MOCK) return MOCK_EXERCISE_RECORDS;
  return request<ExerciseRecord[]>('/exercise-records');
}

/**
 * 创建运动打卡记录
 * POST /exercise-records
 *
 * @body  ExerciseRecord（id 由后端生成）
 * @returns ExerciseRecord
 */
export async function createExerciseRecord(record: ExerciseRecord): Promise<ExerciseRecord> {
  if (USE_MOCK) return record;
  return request<ExerciseRecord>('/exercise-records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

/**
 * 更新运动记录（营养师批注）
 * PATCH /exercise-records/{id}
 *
 * @body  Partial<ExerciseRecord> - { dietitianComment, dietitianName, dietitianCommentDate }
 * @returns ExerciseRecord
 */
export async function updateExerciseRecord(id: string, updates: Partial<ExerciseRecord>): Promise<ExerciseRecord> {
  if (USE_MOCK) return { id, ...updates } as ExerciseRecord;
  return request<ExerciseRecord>(`/exercise-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============ 体重打卡 ============

/**
 * 获取所有体重打卡记录
 * GET /weight-records
 *
 * @returns WeightRecord[] — 按 date 升序
 *
 * 业务规则: 体重打卡不影响"完成当天"判定，也不影响连续打卡天数。
 *           仅用于体重趋势图展示。
 */
export async function getWeightRecords(): Promise<WeightRecord[]> {
  if (USE_MOCK) return MOCK_WEIGHT_RECORDS;
  return request<WeightRecord[]>('/weight-records');
}

/**
 * 创建体重打卡记录
 * POST /weight-records
 *
 * @body  WeightRecord — { id, date: "yyyy-MM-dd HH:mm", weight: number }
 * @returns WeightRecord
 */
export async function createWeightRecord(record: WeightRecord): Promise<WeightRecord> {
  if (USE_MOCK) return record;
  return request<WeightRecord>('/weight-records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

/**
 * 更新体重打卡记录（营养师批注）
 * PATCH /weight-records/{id}
 *
 * @body  Partial<WeightRecord> - { dietitianComment, dietitianName, dietitianCommentDate }
 * @returns WeightRecord
 */
export async function updateWeightRecord(id: string, updates: Partial<WeightRecord>): Promise<WeightRecord> {
  if (USE_MOCK) return { id, ...updates } as WeightRecord;
  return request<WeightRecord>(`/weight-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * 获取指定学员的体重打卡记录
 * GET /weight-records?studentId={studentId}
 *
 * 营养师端学员档案使用此接口获取学员体重数据。
 * 学员端打卡后，数据通过 store -> api.createWeightRecord -> 后端，
 * 营养师端 init() 或手动刷新即可同步最新数据。
 *
 * @param studentId  学员ID
 * @returns WeightRecord[] - 按 date 升序
 */
export async function getWeightRecordsByStudent(studentId: string): Promise<WeightRecord[]> {
  if (USE_MOCK) return MOCK_WEIGHT_RECORDS.filter((r) => r.studentId === studentId);
  return request<WeightRecord[]>(`/weight-records?studentId=${encodeURIComponent(studentId)}`);
}

// ============ 教练活动（图文/视频） ============

/**
 * 获取教练发布的活动列表
 * GET /coach-activities
 *
 * @returns CoachActivityRecord[] — 按 date 降序
 */
export async function getCoachActivities(): Promise<CoachActivityRecord[]> {
  if (USE_MOCK) return MOCK_COACH_ACTIVITIES;
  return request<CoachActivityRecord[]>('/coach-activities');
}

/**
 * 创建教练活动（教练端发布图文/视频）
 * POST /coach-activities
 *
 * @body  CoachActivityRecord
 * @returns CoachActivityRecord
 */
export async function createCoachActivity(record: CoachActivityRecord): Promise<CoachActivityRecord> {
  if (USE_MOCK) return record;
  return request<CoachActivityRecord>('/coach-activities', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

// ============ 奖励阶梯配置 ============

/**
 * 获取所有奖励阶梯配置
 * GET /reward-tiers
 *
 * @returns RewardTier[] — 按 requiredDays 升序
 *
 * 业务规则: 营养师/管理员配置。每档包含名称、所需连续打卡天数、库存。
 *           学员连续打卡天数 >= requiredDays 时解锁该档奖励。
 */
export async function getRewardTiers(): Promise<RewardTier[]> {
  if (USE_MOCK) return MOCK_REWARD_TIERS;
  return request<RewardTier[]>('/reward-tiers');
}

/**
 * 新增奖励阶梯
 * POST /reward-tiers
 *
 * @body  RewardTier — { id, name, requiredDays, imageUrl, stock, description? }
 * @returns RewardTier
 */
export async function createRewardTier(tier: RewardTier): Promise<RewardTier> {
  if (USE_MOCK) return tier;
  return request<RewardTier>('/reward-tiers', {
    method: 'POST',
    body: JSON.stringify(tier),
  });
}

/**
 * 更新奖励阶梯（修改名称/天数/库存等）
 * PATCH /reward-tiers/:id
 *
 * @body  Partial<RewardTier>
 * @returns RewardTier
 */
export async function updateRewardTier(id: string, updates: Partial<RewardTier>): Promise<RewardTier> {
  if (USE_MOCK) return { id, ...updates } as RewardTier;
  return request<RewardTier>(`/reward-tiers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * 删除奖励阶梯
 * DELETE /reward-tiers/:id
 */
export async function deleteRewardTier(id: string): Promise<void> {
  if (USE_MOCK) return;
  return request<void>(`/reward-tiers/${id}`, { method: 'DELETE' });
}

// ============ 奖励领取记录 ============

/**
 * 获取所有奖励领取记录
 * GET /reward-claims
 *
 * @returns RewardClaim[] — 包含所有学员的领取记录
 *
 * 业务规则: 管理员端用于发货管理。前端按 studentId 过滤当前用户的记录。
 */
export async function getRewardClaims(): Promise<RewardClaim[]> {
  if (USE_MOCK) return MOCK_REWARD_CLAIMS;
  return request<RewardClaim[]>('/reward-claims');
}

/**
 * 创建奖励领取记录（学员领取奖品）
 * POST /reward-claims
 *
 * @body  RewardClaim — { id, tierId, studentId, studentName,
 *                        recipientName, recipientPhone, recipientAddress,
 *                        claimDate, status: 'pending' }
 * @returns RewardClaim
 *
 * 业务规则:
 *   1. 当前连续打卡天数 >= tier.requiredDays（前端已校验）
 *   2. 该阶梯未被当前用户领取过（前端已校验）
 *   3. 库存 > 0（前端已校验）
 *   4. 后端创建 claim 记录后，应同时扣减对应 tier 的 stock
 */
export async function createRewardClaim(claim: RewardClaim): Promise<RewardClaim> {
  if (USE_MOCK) return claim;
  return request<RewardClaim>('/reward-claims', {
    method: 'POST',
    body: JSON.stringify(claim),
  });
}

/**
 * 更新领取记录（管理员发货：填写快递单号）
 * PATCH /reward-claims/:id
 *
 * @body  Partial<RewardClaim> — 通常传 { status: 'shipped', trackingNumber, shipDate }
 * @returns RewardClaim
 */
export async function updateRewardClaim(id: string, updates: Partial<RewardClaim>): Promise<RewardClaim> {
  if (USE_MOCK) return { id, ...updates } as RewardClaim;
  return request<RewardClaim>(`/reward-claims/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============ 餐时配置 ============

/**
 * 获取餐时配置（各餐打卡时间窗口）
 * GET /meal-time-config
 *
 * @returns MealTimeConfig — breakfast/lunch/dinner/snack 各含 { start, end, enabled }
 *
 * 业务规则: 饮食打卡时校验当前时间是否在对应餐时窗口内。
 *           enabled=false 时该餐不限制时间。
 */
export async function getMealTimeConfig(): Promise<MealTimeConfig> {
  if (USE_MOCK) return DEFAULT_MEAL_TIME_CONFIG;
  return request<MealTimeConfig>('/meal-time-config');
}

/**
 * 更新餐时配置
 * PUT /meal-time-config
 *
 * @body  MealTimeConfig — 完整配置
 * @returns MealTimeConfig
 */
export async function updateMealTimeConfigApi(config: MealTimeConfig): Promise<MealTimeConfig> {
  if (USE_MOCK) return config;
  return request<MealTimeConfig>('/meal-time-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

// ============ 自查问卷 ============

/**
 * 获取已提交的自查问卷
 * GET /questionnaire
 */
export async function getQuestionnaire(): Promise<any> {
  if (USE_MOCK) {
    const saved = localStorage.getItem('submitted_questionnaire') || localStorage.getItem('draft_questionnaire');
    return saved ? JSON.parse(saved) : null;
  }
  return request<any>('/questionnaire');
}

/**
 * 提交自查问卷
 * POST /questionnaire
 */
export async function saveQuestionnaire(data: any): Promise<any> {
  if (USE_MOCK) {
    localStorage.setItem('submitted_questionnaire', JSON.stringify(data));
    return data;
  }
  return request<any>('/questionnaire', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============ 健康指标配置 ============

/**
 * 获取所有健康指标配置（指标名称/单位/参考区间/分类）
 * GET /metric-configs
 *
 * @returns MetricConfig[] - 30 项指标配置（身体测量/肝功能/肾功能/血脂/血糖/营养）
 *
 * 业务规则: 营养师可在配置页面增删改指标。指标配置影响异常检测和结营报告计算。
 */
export async function getMetricConfigs(): Promise<MetricConfig[]> {
  if (USE_MOCK) return DEFAULT_METRIC_CONFIGS;
  return request<MetricConfig[]>('/metric-configs');
}

/**
 * 新增健康指标配置
 * POST /metric-configs
 *
 * @body  MetricConfig - { id, name, unit, normalRange?, category }
 * @returns MetricConfig
 */
export async function createMetricConfig(config: MetricConfig): Promise<MetricConfig> {
  if (USE_MOCK) return config;
  return request<MetricConfig>('/metric-configs', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/**
 * 更新健康指标配置
 * PATCH /metric-configs/:id
 *
 * @body  Partial<MetricConfig> - 可更新 name/unit/normalRange/category
 * @returns MetricConfig
 */
export async function updateMetricConfig(id: string, updates: Partial<MetricConfig>): Promise<MetricConfig> {
  if (USE_MOCK) return { id, ...updates } as MetricConfig;
  return request<MetricConfig>(`/metric-configs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * 删除健康指标配置
 * DELETE /metric-configs/:id
 */
export async function deleteMetricConfig(id: string): Promise<void> {
  if (USE_MOCK) return;
  return request<void>(`/metric-configs/${id}`, { method: 'DELETE' });
}

// ============ 学员指标前后数值 ============

/**
 * 获取指定学员的指标前后检测数值
 * GET /metric-values?studentId={studentId}
 *
 * @param studentId  学员ID
 * @returns Record<string, MetricValue> - key = configId, value = { beforeValue, afterValue }
 *
 * 业务规则:
 *   - beforeValue = 开营前检测值, afterValue = 结营后检测值
 *   - 数值型指标参与变化量/改善率计算, 字符串型仅展示
 *   - "有效学员" = 至少一项"身体测量数据"分类指标同时有 beforeValue 和 afterValue（数值型）
 */
export async function getMetricValues(studentId: string): Promise<Record<string, MetricValue>> {
  if (USE_MOCK) {
    return MOCK_STUDENT_METRIC_VALUES[studentId] || MOCK_METRIC_VALUES;
  }
  return request<Record<string, MetricValue>>(`/metric-values?studentId=${encodeURIComponent(studentId)}`);
}

/**
 * 获取全部学员的指标前后检测数值（营养师端结营统计用）
 * GET /metric-values
 *
 * @returns Record<string, Record<string, MetricValue>> - key = studentId, value = { configId: MetricValue }
 */
export async function getAllMetricValues(): Promise<Record<string, Record<string, MetricValue>>> {
  if (USE_MOCK) return MOCK_STUDENT_METRIC_VALUES;
  return request<Record<string, Record<string, MetricValue>>>('/metric-values');
}

/**
 * 更新学员指标检测数值（营养师在学员档案->基础医疗Tab维护）
 * PUT /metric-values/:studentId
 *
 * @param studentId  学员ID
 * @param values     完整的指标数值对象 { [configId]: { beforeValue, afterValue } }
 * @returns 更新后的完整数值对象
 */
export async function updateMetricValues(
  studentId: string,
  values: Record<string, MetricValue>,
): Promise<Record<string, MetricValue>> {
  if (USE_MOCK) return values;
  return request<Record<string, MetricValue>>(`/metric-values/${encodeURIComponent(studentId)}`, {
    method: 'PUT',
    body: JSON.stringify(values),
  });
}

// ============ 文件上传 ============

/**
 * 上传文件（图片/视频）
 * POST /upload
 *
 * @body  FormData (file)
 * @returns string — 可访问的 URL
 *
 * mock: 返回 blob URL（刷新失效，仅原型用）
 * 真实: 上传到对象存储，返回持久 URL
 */
export async function uploadFile(file: File): Promise<string> {
  if (USE_MOCK) return URL.createObjectURL(file);
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('upload failed');
  const data = await res.json();
  return data.url as string;
}
