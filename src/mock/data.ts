import type { User, WeightRecord, ExerciseRecord, DietRecord, CoachActivityRecord, RewardTier, RewardClaim, MealTimeConfig, MetricConfig } from '../types';
import type { MetricValue } from '../lib/medicalData';

/** 生成奖品展示图 SVG data URI */
function rewardImg(name: string, emoji: string, c1: string, c2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)" rx="20"/><text x="200" y="180" font-size="130" text-anchor="middle" dominant-baseline="central">${emoji}</text><text x="200" y="320" font-size="34" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui,sans-serif">${name}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function iso(offsetDays: number, time: string): string {
  return `${dateStr(offsetDays)} ${time}`;
}

export const MOCK_STUDENTS: { id: string; name: string; age: number; gender: 'male' | 'female'; phone: string }[] = [
  { id: 's1', name: '李明', age: 32, gender: 'male', phone: '13800000001' },
  { id: 's2', name: '王丽', age: 28, gender: 'female', phone: '13800000002' },
  { id: 's3', name: '张伟', age: 45, gender: 'male', phone: '13800000003' },
  { id: 's4', name: '赵静', age: 26, gender: 'female', phone: '13800000004' },
  { id: 's5', name: '周杰', age: 31, gender: 'male', phone: '13800000005' },
  { id: 's6', name: '吴磊', age: 29, gender: 'male', phone: '13800000006' },
  { id: 's7', name: '郑爽', age: 24, gender: 'female', phone: '13800000007' },
  { id: 's8', name: '王强', age: 35, gender: 'male', phone: '13800000008' },
  { id: 's9', name: '刘梅', age: 33, gender: 'female', phone: '13800000009' },
  { id: 's10', name: '孙悟空', age: 30, gender: 'male', phone: '13800000010' }
];

// 完整打卡天数：今天往前连续 N 天，三餐+运动都完成
const COMPLETE_DAYS = 11;

export const MOCK_DIET_RECORDS: DietRecord[] = [];

export const MOCK_EXERCISE_RECORDS: ExerciseRecord[] = [];

// 生成连续完成打卡数据
for (let i = -(COMPLETE_DAYS - 1); i <= 0; i++) {
  const idSuffix = Math.abs(i).toString().padStart(2, '0');
  MOCK_DIET_RECORDS.push(
    {
      id: `d_b_${idSuffix}`,
      studentId: 's1',
      date: iso(i, '08:00:00'),
      meal: 'breakfast',
      description: '燕麦粥一碗，白煮蛋两个，一杯牛奶',
      photos: ['https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80'],
      dietitianComment: i < 0 && i % 3 === 0 ? '早餐搭配很不错，继续保持！' : undefined,
      dietitianCommentDate: i < 0 && i % 3 === 0 ? iso(i, '10:00:00') : undefined,
      dietitianName: i < 0 && i % 3 === 0 ? '王营养师' : undefined,
      dietitianScore: i < 0 ? (i === -1 ? 1 : 2) : undefined,
      hasStaple: i < 0 ? true : undefined,
      hasProtein: i < 0 ? true : undefined,
      hasVegetable: i < 0 ? false : undefined,
    },
    {
      id: `d_l_${idSuffix}`,
      studentId: 's1',
      date: iso(i, '12:30:00'),
      meal: 'lunch',
      description: '香煎鸡胸肉沙拉，油醋汁',
      photos: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'],
      dietitianComment: i < 0 && i % 4 === 0 ? '非常标准的减脂餐。' : undefined,
      dietitianCommentDate: i < 0 && i % 4 === 0 ? iso(i, '14:00:00') : undefined,
      dietitianName: i < 0 && i % 4 === 0 ? '王营养师' : undefined,
      dietitianScore: i < 0 ? 2 : undefined,
      hasStaple: i < 0 ? false : undefined,
      hasProtein: i < 0 ? (i === -3 ? false : true) : undefined,
      hasVegetable: i < 0 ? true : undefined,
    },
    {
      id: `d_d_${idSuffix}`,
      studentId: 's1',
      date: iso(i, '18:30:00'),
      meal: 'dinner',
      description: '紫薯、牛肉、西兰花',
      photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'],
      dietitianComment: i < 0 && i % 5 === 0 ? '晚餐注意控制主食量。' : undefined,
      dietitianCommentDate: i < 0 && i % 5 === 0 ? iso(i, '20:00:00') : undefined,
      dietitianName: i < 0 && i % 5 === 0 ? '王营养师' : undefined,
      dietitianScore: i < 0 ? 2 : undefined,
      hasStaple: i < 0 ? true : undefined,
      hasProtein: i < 0 ? true : undefined,
      hasVegetable: i < 0 ? true : undefined,
    },
  );
  MOCK_EXERCISE_RECORDS.push({
    id: `e_${idSuffix}`,
    studentId: 's1',
    date: iso(i, '19:00:00'),
    type: i % 3 === 0 ? '游泳' : i % 3 === 1 ? '跑步' : '力量训练',
    duration: 40 + (i % 3) * 10,
    intensity: 3 + (i % 2),
    photos: i % 2 === 0 ? ['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80'] : undefined,
    dietitianComment: i < 0 ? (i % 3 === 0 ? '游泳是有氧好选择，注意拉伸！' : i % 3 === 1 ? '配速不错，继续保持。' : '动作标准，力量稳步提升。') : undefined,
    dietitianCommentDate: i < 0 ? iso(i, '21:00:00') : undefined,
    dietitianName: i < 0 ? '王营养师' : undefined,
    dietitianScore: i < 0 ? 2 : undefined,
  });
}

// s1 每日体重记录（与打卡天数一致，确保5项全部完成）
export const MOCK_WEIGHT_RECORDS: WeightRecord[] = [
  // 入营初始记录（在连续打卡周期之外）
  {
    id: 'w0_5',
    date: iso(-15, '07:00:00'),
    weight: 66.8,
    studentId: 's1',
    photos: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80'],
    dietitianComment: '入营初始体重，建议每日晨起空腹称重，保持同一时间点记录更准确。',
    dietitianName: '王营养师',
    dietitianCommentDate: iso(-15, '10:30:00'),
  },
  {
    id: 'w0_4',
    date: iso(-12, '07:10:00'),
    weight: 66.3,
    studentId: 's1',
    dietitianComment: '下降0.5kg，趋势良好，注意保证每日饮水量2000ml以上。',
    dietitianName: '王营养师',
    dietitianCommentDate: iso(-12, '14:20:00'),
  },
];

// 生成连续打卡期间的每日体重记录
for (let i = -(COMPLETE_DAYS - 1); i <= 0; i++) {
  const idSuffix = Math.abs(i).toString().padStart(2, '0');
  // 体重从 66.0 (day -10) 线性下降到 64.7 (day 0)，每日约 -0.13kg
  const weight = parseFloat((66.0 - (i + COMPLETE_DAYS - 1) * 0.13).toFixed(1));
  const hasComment = i === -7 || i === -4 || i === -1;
  let comment: string | undefined;
  let commentDate: string | undefined;
  if (i === -7) {
    comment = '累计减重1.3kg，趋势稳定，建议增加蛋白质摄入防止肌肉流失。';
    commentDate = iso(-7, '11:00:00');
  } else if (i === -4) {
    comment = '体重持续下降，继续保持饮食和运动的配合！';
    commentDate = iso(-4, '10:00:00');
  } else if (i === -1) {
    comment = '今日体重创新低！累计减重2.1kg，脂肪燃烧效率很好，继续保持！';
    commentDate = iso(-1, '09:45:00');
  }
  MOCK_WEIGHT_RECORDS.push({
    id: `w_${idSuffix}`,
    date: iso(i, '07:05:00'),
    weight,
    studentId: 's1',
    photos: i === -1 ? [
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
    ] : undefined,
    dietitianComment: comment,
    dietitianName: comment ? '王营养师' : undefined,
    dietitianCommentDate: commentDate,
  });
}

// 其他学员今日/昨日数据（用于排行榜、批注等）
MOCK_DIET_RECORDS.push(
  {
    id: 'd6',
    studentId: 's2',
    date: iso(0, '07:30:00'),
    meal: 'breakfast',
    description: '全麦面包两片，无糖豆浆一杯，蓝莓一小把',
    photos: ['https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?w=400&q=80'],
  },
  {
    id: 'd7',
    studentId: 's2',
    date: iso(0, '12:40:00'),
    meal: 'lunch',
    description: '水煮虾10只，西兰花，藜麦饭半碗',
    photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'],
  },
  {
    id: 'd8',
    studentId: 's3',
    date: iso(0, '08:15:00'),
    meal: 'breakfast',
    description: '未进食',
    isFasted: true,
    photos: ['https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80'],
  },
  {
    id: 'd9',
    studentId: 's3',
    date: iso(0, '12:00:00'),
    meal: 'lunch',
    description: '鸡胸肉沙拉',
    photos: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'],
    dietitianComment: '鸡胸肉沙拉很棒，注意沙拉酱的热量。',
    dietitianScore: 2,
  },
  {
    id: 'd10',
    studentId: 's3',
    date: iso(0, '18:00:00'),
    meal: 'dinner',
    description: '紫薯、牛肉',
    photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'],
    dietitianComment: '牛肉补充蛋白质很好。',
    dietitianScore: 2,
  },
);

MOCK_EXERCISE_RECORDS.push(
  {
    id: 'e_s2_1',
    studentId: 's2',
    date: iso(0, '17:30:00'),
    type: '跑步',
    duration: 20,
    intensity: 3,
    // 未批注 - 出现在待批注列表
  },
  {
    id: 'e_s3_1',
    studentId: 's3',
    date: iso(0, '20:00:00'),
    type: '瑜伽',
    duration: 40,
    intensity: 2,
    dietitianComment: '核心收紧得很好，拉伸很到位，继续保持！',
    dietitianName: '营养师王老师',
    dietitianCommentDate: iso(0, '20:30:00'),
  },
  {
    id: 'e_s1_video',
    studentId: 's1',
    date: iso(0, '19:30:00'),
    type: '跑步',
    duration: 45,
    intensity: 4,
    notes: '今天尝试了新的跑步路线，感觉不错！',
    videoUrls: ['http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
    // 未批注 - 出现在待批注列表
  },
);

// 为 s2, s3, s4 生成历史打卡数据（用于结营报告统计）
// 注意：循环不含今天(i<0)，今日数据由下方单独 push 的记录提供，避免重复
const PAST_DAYS_S2 = 8; // s2 连续完成 8 天（含今日）
const PAST_DAYS_S3 = 5; // s3 连续完成 5 天（含今日）
const PAST_DAYS_S4 = 10; // s4 连续完成 10 天（含今日）

for (let i = -(PAST_DAYS_S2 - 1); i < 0; i++) {
  const idSuffix = `s2_${Math.abs(i).toString().padStart(2, '0')}`;
  MOCK_DIET_RECORDS.push(
    { id: `d_b_${idSuffix}`, studentId: 's2', date: iso(i, '07:30:00'), meal: 'breakfast', description: '全麦面包+牛奶', photos: [], dietitianScore: 2 },
    { id: `d_l_${idSuffix}`, studentId: 's2', date: iso(i, '12:00:00'), meal: 'lunch', description: '鸡胸肉沙拉+糙米饭', photos: [], dietitianScore: 2 },
    { id: `d_d_${idSuffix}`, studentId: 's2', date: iso(i, '18:00:00'), meal: 'dinner', description: '清蒸鱼+西兰花', photos: [], dietitianScore: 2 },
  );
  MOCK_EXERCISE_RECORDS.push({ id: `e_${idSuffix}`, studentId: 's2', date: iso(i, '17:30:00'), type: '跑步', duration: 45, intensity: 3, dietitianScore: i === -1 ? 1 : 2 });
}

for (let i = -(PAST_DAYS_S3 - 1); i < 0; i++) {
  const idSuffix = `s3_${Math.abs(i).toString().padStart(2, '0')}`;
  MOCK_DIET_RECORDS.push(
    { id: `d_b_${idSuffix}`, studentId: 's3', date: iso(i, '08:00:00'), meal: 'breakfast', description: '燕麦粥+鸡蛋', photos: [], dietitianScore: i === -2 ? 1 : 2 },
    { id: `d_l_${idSuffix}`, studentId: 's3', date: iso(i, '12:30:00'), meal: 'lunch', description: '牛肉+紫薯+蔬菜', photos: [], dietitianScore: i === -2 ? 1 : 2 },
    { id: `d_d_${idSuffix}`, studentId: 's3', date: iso(i, '18:30:00'), meal: 'dinner', description: '鸡胸肉+蔬菜汤', photos: [], dietitianScore: i === -2 ? 1 : 2 },
  );
  MOCK_EXERCISE_RECORDS.push({ id: `e_${idSuffix}`, studentId: 's3', date: iso(i, '19:00:00'), type: '力量训练', duration: 45, intensity: 4, dietitianScore: 2 });
}

for (let i = -(PAST_DAYS_S4 - 1); i < 0; i++) {
  const idSuffix = `s4_${Math.abs(i).toString().padStart(2, '0')}`;
  MOCK_DIET_RECORDS.push(
    { id: `d_b_${idSuffix}`, studentId: 's4', date: iso(i, '07:20:00'), meal: 'breakfast', description: '杂粮粥+煮蛋', photos: [], dietitianScore: 2 },
    { id: `d_l_${idSuffix}`, studentId: 's4', date: iso(i, '12:00:00'), meal: 'lunch', description: '虾仁+藜麦+蔬菜', photos: [], dietitianScore: 2 },
    { id: `d_d_${idSuffix}`, studentId: 's4', date: iso(i, '18:00:00'), meal: 'dinner', description: '豆腐+蔬菜+少量主食', photos: [], dietitianScore: 2 },
  );
  MOCK_EXERCISE_RECORDS.push({ id: `e_${idSuffix}`, studentId: 's4', date: iso(i, '18:30:00'), type: i % 2 === 0 ? '瑜伽' : '游泳', duration: i === -1 ? 35 : 40, intensity: 3, dietitianScore: i === -1 ? 1 : 2 });
}

// s2 今日晚餐（单独 push 的 d6/d7 只有早午餐，补晚餐使今日打卡完整）
MOCK_DIET_RECORDS.push({
  id: 'd_s2_dinner_today',
  studentId: 's2',
  date: iso(0, '18:20:00'),
  meal: 'dinner',
  description: '清蒸鲈鱼+凉拌菠菜+小米粥',
  photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'],
  dietitianScore: 2,
});

// s2/s3/s4 体重记录（与打卡天数对齐，确保 isDayComplete 五项齐全）
// s2: 58.0 -> 56.2 (8天，减重约3.1%，达3%里程碑)
for (let i = -(PAST_DAYS_S2 - 1); i <= 0; i++) {
  const idSuffix = `s2_${Math.abs(i).toString().padStart(2, '0')}`;
  const w = parseFloat((58.0 - (i + PAST_DAYS_S2 - 1) * 0.25).toFixed(1));
  MOCK_WEIGHT_RECORDS.push({ id: `w_${idSuffix}`, date: iso(i, '07:10:00'), weight: w, studentId: 's2' });
}
// s3: 75.0 -> 72.7 (5天，减重约3.1%，达3%里程碑)
for (let i = -(PAST_DAYS_S3 - 1); i <= 0; i++) {
  const idSuffix = `s3_${Math.abs(i).toString().padStart(2, '0')}`;
  const w = parseFloat((75.0 - (i + PAST_DAYS_S3 - 1) * 0.57).toFixed(1));
  MOCK_WEIGHT_RECORDS.push({ id: `w_${idSuffix}`, date: iso(i, '07:15:00'), weight: w, studentId: 's3' });
}
// s4: 55.0 -> 53.3 (10天，减重约3.1%，达3%里程碑)
for (let i = -(PAST_DAYS_S4 - 1); i <= 0; i++) {
  const idSuffix = `s4_${Math.abs(i).toString().padStart(2, '0')}`;
  const w = parseFloat((55.0 - (i + PAST_DAYS_S4 - 1) * 0.19).toFixed(1));
  MOCK_WEIGHT_RECORDS.push({ id: `w_${idSuffix}`, date: iso(i, '07:00:00'), weight: w, studentId: 's4' });
}

export const MOCK_COACH_ACTIVITIES: CoachActivityRecord[] = [
  {
    id: 'a1',
    title: '全身燃脂 HIIT',
    description: '每天坚持15分钟，帮你快速燃烧卡路里！第一步：高抬腿；第二步：开合跳；第三步：波比跳。',
    imageUrls: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
    ],
    coachName: '李教练',
    date: dateStr(0),
    videoUrls: ['http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
  },
  {
    id: 'a2',
    title: '晨间瑜伽唤醒',
    description: '通过几个简单的体式，唤醒僵硬的身体，开始元气满满的一天。',
    imageUrls: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
      'https://images.unsplash.com/photo-1599901860904-17e08c2d159a?w=800&q=80'
    ],
    coachName: '王教练',
    date: dateStr(-1),
  },
  {
    id: 'a3',
    title: '核心力量强化',
    description: '不要只关注马甲线，核心肌群的强化对任何运动都至关重要。',
    imageUrls: [
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
    ],
    coachName: '张教练',
    date: dateStr(-2),
  }
];

// Mock reward data
export const MOCK_REWARD_TIERS: RewardTier[] = [
  {
    id: 't0',
    name: '运动跳绳',
    requiredDays: 5,
    imageUrl: rewardImg('运动跳绳', '🏃', '#4A90D9', '#357ABD'),
    stock: 100,
    source: 'streak',
  },
  {
    id: 't1',
    name: '运动水杯',
    requiredDays: 10,
    imageUrl: rewardImg('运动水杯', '🥤', '#07C160', '#06A952'),
    stock: 50,
    source: 'streak',
  },
  {
    id: 't2',
    name: '瑜伽垫',
    requiredDays: 21,
    imageUrl: rewardImg('瑜伽垫', '🧘', '#8B5CF6', '#7C3AED'),
    stock: 20,
    source: 'streak',
  },
  {
    id: 't3',
    name: '智能体脂秤',
    requiredDays: 28,
    imageUrl: rewardImg('智能体脂秤', '⚖️', '#374151', '#1F2937'),
    stock: 5,
    source: 'streak',
  },
  // 趣味活动奖品
  {
    id: 't4',
    name: '减重里程碑奖·一档',
    requiredDays: 0,
    imageUrl: rewardImg('里程碑奖', '🏅', '#F59E0B', '#D97706'),
    stock: 30,
    source: 'activity',
    activityType: 'milestone',
    description: '减重达 3% 发放',
  },
  {
    id: 't5',
    name: '减重里程碑奖·二档',
    requiredDays: 0,
    imageUrl: rewardImg('里程碑奖', '🏆', '#F59E0B', '#D97706'),
    stock: 15,
    source: 'activity',
    activityType: 'milestone',
    description: '减重达 5% 发放',
  },
  {
    id: 't6',
    name: '每周挑战奖品',
    requiredDays: 0,
    imageUrl: rewardImg('挑战奖', '🎁', '#07C160', '#06A952'),
    stock: 40,
    source: 'activity',
    activityType: 'weekly',
    description: '完成每周主题挑战发放',
  },
  {
    id: 't7',
    name: '全勤抽奖奖品',
    requiredDays: 0,
    imageUrl: rewardImg('抽奖奖', '🎉', '#8B5CF6', '#7C3AED'),
    stock: 10,
    source: 'activity',
    activityType: 'lucky',
    description: '全勤幸运抽奖发放',
  },
];

export const MOCK_REWARD_CLAIMS: RewardClaim[] = [
  {
    id: 'c1',
    tierId: 't0',
    studentId: 's1',
    studentName: '李明',
    recipientName: '李明',
    recipientPhone: '13800000001',
    recipientAddress: '北京市朝阳区某某路1号',
    claimDate: iso(-6, '10:00:00'),
    status: 'shipped',
    trackingNumber: 'SF1029384756',
    shipDate: iso(-5, '09:00:00'),
  },
  {
    id: 'c2',
    tierId: 't0',
    studentId: 's2',
    studentName: '王丽',
    recipientName: '王丽',
    recipientPhone: '13800000002',
    recipientAddress: '上海市浦东新区某某路2号',
    claimDate: iso(0, '11:00:00'),
    status: 'pending',
  },
  // 活动奖励 - 阶梯减重达标（营养师已审核通过，等待学员领取）
  {
    id: 'c3',
    tierId: 't4',
    studentId: 's1',
    studentName: '李明',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    claimDate: iso(-1, '15:00:00'),
    status: 'confirmed',
    activityType: 'milestone',
  },
  // 活动奖励 - 阶梯减重达标（学员已领取，等待营养师发货）
  {
    id: 'c4',
    tierId: 't4',
    studentId: 's2',
    studentName: '王丽',
    recipientName: '王丽',
    recipientPhone: '13800000002',
    recipientAddress: '上海市浦东新区某某路2号',
    claimDate: iso(-1, '10:00:00'),
    status: 'pending',
    deliveryMethod: 'shipped',
    activityType: 'milestone',
  },
  // 活动奖励 - 阶梯减重达标（已线下发放）
  {
    id: 'c5',
    tierId: 't4',
    studentId: 's3',
    studentName: '张伟',
    recipientName: '张伟',
    recipientPhone: '13800000003',
    recipientAddress: '线下领取',
    claimDate: iso(-3, '10:00:00'),
    status: 'in-person',
    deliveryMethod: 'in-person',
    deliveredAt: iso(-2, '14:00:00'),
    activityType: 'milestone',
  },
];

// Default meal time config - 默认全部关闭，学员可随时打卡
export const DEFAULT_MEAL_TIME_CONFIG: MealTimeConfig = {
  breakfast: { start: '06:00', end: '10:00', enabled: false },
  lunch: { start: '11:00', end: '14:00', enabled: false },
  dinner: { start: '17:00', end: '21:00', enabled: false },
  snack: { start: '14:00', end: '17:00', enabled: false },
};

// Default health metric configs (clinical indicators with gender-specific ranges)
export const DEFAULT_METRIC_CONFIGS: MetricConfig[] = [
  // 身体测量数据
  { id: 'mc_body_weight', name: '体重', unit: 'kg', normalRange: '参考值视身高而定', category: '身体测量数据' },
  { id: 'mc_body_muscle', name: '肌肉量', unit: 'kg', normalRange: '40.0 - 55.0', category: '身体测量数据' },
  { id: 'mc_body_skeletal', name: '骨骼肌', unit: 'kg', normalRange: '25.0 - 35.0', category: '身体测量数据' },
  { id: 'mc_body_fat', name: '脂肪量', unit: 'kg', normalRange: '10.0 - 20.0', category: '身体测量数据' },
  { id: 'mc_body_bmr', name: '基础代谢率', unit: 'kcal', normalRange: '1300 - 1700', category: '身体测量数据' },
  { id: 'mc_body_whr', name: '腰臀比', unit: '', normalRange: '0.70 - 0.90', category: '身体测量数据' },
  { id: 'mc_body_visceral', name: '内脏脂肪面积', unit: 'cm²', normalRange: '50 - 100', category: '身体测量数据' },
  { id: 'mc_body_obesity', name: '肥胖度', unit: '%', normalRange: '90 - 110', category: '身体测量数据' },
  { id: 'mc_body_cell', name: '身体细胞量', unit: 'kg', normalRange: '30.0 - 45.0', category: '身体测量数据' },
  { id: 'mc_body_edema', name: '浮肿指数', unit: '', normalRange: '0.36 - 0.39', category: '身体测量数据' },
  { id: 'mc_body_asmi', name: '四肢骨骼肌质量指数', unit: 'kg/㎡', normalRange: '6.0 - 9.0', category: '身体测量数据' },
  { id: 'mc_body_ainst', name: 'AINST评分', unit: '分', normalRange: '70 - 100', category: '身体测量数据' },
  // 肝功能相关
  { id: 'mc_liver_alt', name: '丙氨酸氨基转移酶', unit: 'U/L', normalRange: '男9-50 / 女7-40', category: '肝功能相关' },
  { id: 'mc_liver_ast', name: '天门冬氨酸氨基转移酶', unit: 'U/L', normalRange: '男15-40 / 女13-35', category: '肝功能相关' },
  { id: 'mc_liver_tp', name: '总蛋白', unit: 'g/L', normalRange: '65-85', category: '肝功能相关' },
  { id: 'mc_liver_alb', name: '白蛋白', unit: 'g/L', normalRange: '40-55', category: '肝功能相关' },
  { id: 'mc_liver_palb', name: '前白蛋白', unit: 'mg/L', normalRange: '200-400', category: '肝功能相关' },
  { id: 'mc_liver_tbil', name: '总胆红素', unit: 'μmol/L', normalRange: '男3.4-20.5 / 女3.4-17.1', category: '肝功能相关' },
  { id: 'mc_liver_dbil', name: '直接胆红素', unit: 'μmol/L', normalRange: '0-6.8', category: '肝功能相关' },
  { id: 'mc_liver_alp', name: '碱性磷酸酶', unit: 'U/L', normalRange: '45-125', category: '肝功能相关' },
  { id: 'mc_liver_ggt', name: 'γ-谷氨酰基转移酶', unit: 'U/L', normalRange: '男10-60 / 女7-45', category: '肝功能相关' },
  // 肾功能相关
  { id: 'mc_kidney_urea', name: '尿素', unit: 'mmol/L', normalRange: '男2.9-8.2 / 女2.6-7.5', category: '肾功能相关' },
  { id: 'mc_kidney_cr', name: '肌酐', unit: 'μmol/L', normalRange: '男62-115 / 女53-97', category: '肾功能相关' },
  { id: 'mc_kidney_ua', name: '尿酸', unit: 'μmol/L', normalRange: '男<420 / 女<360', category: '肾功能相关' },
  // 血脂相关
  { id: 'mc_bl_tc', name: '总胆固醇', unit: 'mmol/L', normalRange: '<5.2', category: '血脂相关' },
  { id: 'mc_bl_tg', name: '甘油三酯', unit: 'mmol/L', normalRange: '<1.7', category: '血脂相关' },
  { id: 'mc_bl_hdl', name: '高密度脂蛋白胆固醇', unit: 'mmol/L', normalRange: '>1.04', category: '血脂相关' },
  { id: 'mc_bl_ldl', name: '低密度脂蛋白胆固醇', unit: 'mmol/L', normalRange: '<3.4', category: '血脂相关' },
  // 血糖相关
  { id: 'mc_bs_fasting', name: '葡萄糖(空腹)', unit: 'mmol/L', normalRange: '3.9-6.1', category: '血糖相关' },
  { id: 'mc_bs_hba1c', name: '糖化血红蛋白', unit: '%', normalRange: '4.0-6.0', category: '血糖相关' },
];

// Mock metric values keyed by metric config id (beforeValue/afterValue only;
// isBeforeOut/isAfterOut are computed dynamically by isValueOutOfRange)
// This is the default set (student s1), with afterValues showing improvement
export const MOCK_METRIC_VALUES: Record<string, MetricValue> = {
  'mc_body_weight': { beforeValue: 80.5, afterValue: 75.2 },
  'mc_body_muscle': { beforeValue: 45.2, afterValue: 46.5 },
  'mc_body_skeletal': { beforeValue: 28.1, afterValue: 28.8 },
  'mc_body_fat': { beforeValue: 28.5, afterValue: 23.8 },
  'mc_body_bmr': { beforeValue: 1450, afterValue: 1480 },
  'mc_body_whr': { beforeValue: 0.95, afterValue: 0.88 },
  'mc_body_visceral': { beforeValue: 120, afterValue: 95 },
  'mc_body_obesity': { beforeValue: 125, afterValue: 108 },
  'mc_body_cell': { beforeValue: 35.5, afterValue: 36.2 },
  'mc_body_edema': { beforeValue: 0.40, afterValue: 0.38 },
  'mc_body_asmi': { beforeValue: 7.5, afterValue: 7.8 },
  'mc_body_ainst': { beforeValue: 65, afterValue: 78 },
  'mc_liver_alt': { beforeValue: 55, afterValue: 38 },
  'mc_liver_ast': { beforeValue: 35, afterValue: 28 },
  'mc_liver_tp': { beforeValue: 72, afterValue: 74 },
  'mc_liver_alb': { beforeValue: 45, afterValue: 47 },
  'mc_liver_palb': { beforeValue: 250, afterValue: 280 },
  'mc_liver_tbil': { beforeValue: 15.2, afterValue: 14.0 },
  'mc_liver_dbil': { beforeValue: 4.1, afterValue: 3.5 },
  'mc_liver_alp': { beforeValue: 95, afterValue: 88 },
  'mc_liver_ggt': { beforeValue: 65, afterValue: 42 },
  'mc_kidney_urea': { beforeValue: 5.4, afterValue: 5.0 },
  'mc_kidney_cr': { beforeValue: 88, afterValue: 85 },
  'mc_kidney_ua': { beforeValue: 450, afterValue: 380 },
  'mc_bl_tc': { beforeValue: 5.5, afterValue: 4.8 },
  'mc_bl_tg': { beforeValue: 2.1, afterValue: 1.5 },
  'mc_bl_hdl': { beforeValue: 1.1, afterValue: 1.3 },
  'mc_bl_ldl': { beforeValue: 3.5, afterValue: 2.9 },
  'mc_bs_fasting': { beforeValue: 5.8, afterValue: 5.2 },
  'mc_bs_hba1c': { beforeValue: 6.2, afterValue: 5.8 },
};

/**
 * 每位学员的指标值（用于结营报告）
 * key = studentId, value = { [configId]: MetricValue }
 * s1 使用 MOCK_METRIC_VALUES 的数据（已有 afterValue）
 * 其他学员有各自的 before/after 数据
 */
export const MOCK_STUDENT_METRIC_VALUES: Record<string, Record<string, MetricValue>> = {
  's1': MOCK_METRIC_VALUES,
  's2': {
    'mc_body_weight': { beforeValue: 62.0, afterValue: 58.5 },
    'mc_body_muscle': { beforeValue: 38.0, afterValue: 39.5 },
    'mc_body_skeletal': { beforeValue: 23.5, afterValue: 24.2 },
    'mc_body_fat': { beforeValue: 22.0, afterValue: 18.5 },
    'mc_body_bmr': { beforeValue: 1300, afterValue: 1330 },
    'mc_body_whr': { beforeValue: 0.85, afterValue: 0.80 },
    'mc_body_visceral': { beforeValue: 85, afterValue: 70 },
    'mc_body_obesity': { beforeValue: 105, afterValue: 98 },
    'mc_body_cell': { beforeValue: 30.0, afterValue: 30.8 },
    'mc_body_edema': { beforeValue: 0.38, afterValue: 0.37 },
    'mc_body_asmi': { beforeValue: 6.2, afterValue: 6.5 },
    'mc_body_ainst': { beforeValue: 72, afterValue: 82 },
    'mc_liver_alt': { beforeValue: 28, afterValue: 22 },
    'mc_liver_ast': { beforeValue: 22, afterValue: 20 },
    'mc_liver_tp': { beforeValue: 68, afterValue: 70 },
    'mc_liver_alb': { beforeValue: 42, afterValue: 44 },
    'mc_liver_palb': { beforeValue: 220, afterValue: 250 },
    'mc_liver_tbil': { beforeValue: 12.0, afterValue: 11.0 },
    'mc_liver_dbil': { beforeValue: 3.0, afterValue: 2.5 },
    'mc_liver_alp': { beforeValue: 78, afterValue: 75 },
    'mc_liver_ggt': { beforeValue: 32, afterValue: 25 },
    'mc_kidney_urea': { beforeValue: 4.5, afterValue: 4.2 },
    'mc_kidney_cr': { beforeValue: 62, afterValue: 60 },
    'mc_kidney_ua': { beforeValue: 320, afterValue: 280 },
    'mc_bl_tc': { beforeValue: 4.8, afterValue: 4.2 },
    'mc_bl_tg': { beforeValue: 1.3, afterValue: 1.0 },
    'mc_bl_hdl': { beforeValue: 1.2, afterValue: 1.4 },
    'mc_bl_ldl': { beforeValue: 2.8, afterValue: 2.3 },
    'mc_bs_fasting': { beforeValue: 5.2, afterValue: 4.8 },
    'mc_bs_hba1c': { beforeValue: 5.6, afterValue: 5.3 },
  },
  's3': {
    'mc_body_weight': { beforeValue: 95.0, afterValue: 88.0 },
    'mc_body_muscle': { beforeValue: 48.0, afterValue: 49.5 },
    'mc_body_skeletal': { beforeValue: 30.0, afterValue: 30.8 },
    'mc_body_fat': { beforeValue: 35.0, afterValue: 28.0 },
    'mc_body_bmr': { beforeValue: 1550, afterValue: 1580 },
    'mc_body_whr': { beforeValue: 1.0, afterValue: 0.92 },
    'mc_body_visceral': { beforeValue: 140, afterValue: 105 },
    'mc_body_obesity': { beforeValue: 135, afterValue: 118 },
    'mc_body_cell': { beforeValue: 38.0, afterValue: 39.0 },
    'mc_body_edema': { beforeValue: 0.39, afterValue: 0.38 },
    'mc_body_asmi': { beforeValue: 8.0, afterValue: 8.2 },
    'mc_body_ainst': { beforeValue: 58, afterValue: 72 },
    'mc_liver_alt': { beforeValue: 72, afterValue: 45 },
    'mc_liver_ast': { beforeValue: 48, afterValue: 35 },
    'mc_liver_tp': { beforeValue: 70, afterValue: 73 },
    'mc_liver_alb': { beforeValue: 43, afterValue: 46 },
    'mc_liver_palb': { beforeValue: 230, afterValue: 260 },
    'mc_liver_tbil': { beforeValue: 18.0, afterValue: 15.0 },
    'mc_liver_dbil': { beforeValue: 5.0, afterValue: 4.0 },
    'mc_liver_alp': { beforeValue: 105, afterValue: 95 },
    'mc_liver_ggt': { beforeValue: 80, afterValue: 50 },
    'mc_kidney_urea': { beforeValue: 6.0, afterValue: 5.2 },
    'mc_kidney_cr': { beforeValue: 95, afterValue: 90 },
    'mc_kidney_ua': { beforeValue: 480, afterValue: 400 },
    'mc_bl_tc': { beforeValue: 6.2, afterValue: 5.0 },
    'mc_bl_tg': { beforeValue: 2.8, afterValue: 1.6 },
    'mc_bl_hdl': { beforeValue: 0.9, afterValue: 1.1 },
    'mc_bl_ldl': { beforeValue: 4.0, afterValue: 3.0 },
    'mc_bs_fasting': { beforeValue: 6.5, afterValue: 5.6 },
    'mc_bs_hba1c': { beforeValue: 6.5, afterValue: 5.9 },
  },
  's4': {
    'mc_body_weight': { beforeValue: 58.0, afterValue: 55.5 },
    'mc_body_muscle': { beforeValue: 36.0, afterValue: 37.2 },
    'mc_body_skeletal': { beforeValue: 22.0, afterValue: 22.8 },
    'mc_body_fat': { beforeValue: 19.0, afterValue: 16.0 },
    'mc_body_bmr': { beforeValue: 1250, afterValue: 1280 },
    'mc_body_whr': { beforeValue: 0.82, afterValue: 0.78 },
    'mc_body_visceral': { beforeValue: 75, afterValue: 60 },
    'mc_body_obesity': { beforeValue: 102, afterValue: 96 },
    'mc_body_cell': { beforeValue: 28.0, afterValue: 29.0 },
    'mc_body_edema': { beforeValue: 0.37, afterValue: 0.37 },
    'mc_body_asmi': { beforeValue: 5.8, afterValue: 6.1 },
    'mc_body_ainst': { beforeValue: 75, afterValue: 84 },
    'mc_liver_alt': { beforeValue: 18, afterValue: 16 },
    'mc_liver_ast': { beforeValue: 20, afterValue: 18 },
    'mc_liver_tp': { beforeValue: 70, afterValue: 72 },
    'mc_liver_alb': { beforeValue: 44, afterValue: 45 },
    'mc_liver_palb': { beforeValue: 240, afterValue: 260 },
    'mc_liver_tbil': { beforeValue: 10.5, afterValue: 10.0 },
    'mc_liver_dbil': { beforeValue: 2.8, afterValue: 2.5 },
    'mc_liver_alp': { beforeValue: 72, afterValue: 70 },
    'mc_liver_ggt': { beforeValue: 25, afterValue: 22 },
    'mc_kidney_urea': { beforeValue: 4.0, afterValue: 3.8 },
    'mc_kidney_cr': { beforeValue: 58, afterValue: 56 },
    'mc_kidney_ua': { beforeValue: 280, afterValue: 250 },
    'mc_bl_tc': { beforeValue: 4.5, afterValue: 4.0 },
    'mc_bl_tg': { beforeValue: 1.1, afterValue: 0.9 },
    'mc_bl_hdl': { beforeValue: 1.3, afterValue: 1.5 },
    'mc_bl_ldl': { beforeValue: 2.5, afterValue: 2.1 },
    'mc_bs_fasting': { beforeValue: 5.0, afterValue: 4.7 },
    'mc_bs_hba1c': { beforeValue: 5.4, afterValue: 5.2 },
  },
};

// Per-student weight records (for camp report weight trend)
export const MOCK_STUDENT_WEIGHTS: Record<string, WeightRecord[]> = {
  's2': [
    { id: 'w_s2_1', date: iso(-15, '07:00:00'), weight: 62.0, studentId: 's2' },
    { id: 'w_s2_2', date: iso(-10, '07:10:00'), weight: 61.0, studentId: 's2' },
    { id: 'w_s2_3', date: iso(-5, '07:00:00'), weight: 59.8, studentId: 's2' },
    { id: 'w_s2_4', date: iso(-1, '07:05:00'), weight: 58.5, studentId: 's2' },
  ],
  's3': [
    { id: 'w_s3_1', date: iso(-15, '07:00:00'), weight: 95.0, studentId: 's3' },
    { id: 'w_s3_2', date: iso(-10, '07:10:00'), weight: 92.5, studentId: 's3' },
    { id: 'w_s3_3', date: iso(-5, '07:00:00'), weight: 89.8, studentId: 's3' },
    { id: 'w_s3_4', date: iso(-1, '07:05:00'), weight: 88.0, studentId: 's3' },
  ],
  's4': [
    { id: 'w_s4_1', date: iso(-15, '07:00:00'), weight: 58.0, studentId: 's4' },
    { id: 'w_s4_2', date: iso(-10, '07:10:00'), weight: 57.0, studentId: 's4' },
    { id: 'w_s4_3', date: iso(-5, '07:00:00'), weight: 56.0, studentId: 's4' },
    { id: 'w_s4_4', date: iso(-1, '07:05:00'), weight: 55.5, studentId: 's4' },
  ],
};

// 将所有学员的体重记录合并到 MOCK_WEIGHT_RECORDS，确保 store.weightRecords 包含全部学员数据
// 前后端联调时，后端 GET /weight-records 应返回全部学员的体重记录（含 studentId 字段）
Object.values(MOCK_STUDENT_WEIGHTS).forEach((records) => {
  records.forEach((r) => {
    if (!MOCK_WEIGHT_RECORDS.some((m) => m.id === r.id)) {
      MOCK_WEIGHT_RECORDS.push(r);
    }
  });
});
