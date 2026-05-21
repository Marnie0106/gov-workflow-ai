// ─────────────────────────────────────────────
// 市民工作台 Mock 数据
// ─────────────────────────────────────────────

export const CITIZEN_ID = 'citizen_demo';

export const FUZZY_WORDS = [
  '附近', '大概', '旁边', '这边', '那边',
  '左右', '左边', '右边', '前面', '后面', '周围', '一带',
];

export const INITIAL_TICKETS = [
  {
    id: 1,
    event: '道路垃圾堆积未清运',
    location: '中山路58号门口',
    time: '2026-05-21T08:00',
    status: '待处置',
    dispatchStatus: '已派单',
    source: 'citizen',
    citizenId: CITIZEN_ID,
  },
  {
    id: 2,
    event: '路灯损坏彻夜不亮',
    location: '解放路与和平路交叉口',
    time: '2026-05-20T18:30',
    status: '已完成',
    dispatchStatus: '已完成',
    source: 'citizen',
    citizenId: CITIZEN_ID,
  },
  {
    id: 3,
    event: '乱停车占据人行道',
    location: '人民广场北侧',
    time: '2026-05-20T10:00',
    status: '已完成',
    dispatchStatus: '已完成',
    source: 'citizen',
    citizenId: CITIZEN_ID,
  },
];

export const INITIAL_MESSAGES = [
  {
    id: 1,
    ticketId: 1,
    from: 'dispatcher',
    fromName: '处置员王强',
    to: 'citizen',
    content: '您好，您上报的垃圾清运问题已受理，预计今日下午 14:00 前处置完毕，请关注进度更新。',
    isRead: false,
    time: '2026-05-21T10:30',
  },
  {
    id: 2,
    ticketId: 2,
    from: 'dispatcher',
    fromName: '处置员赵芳',
    to: 'citizen',
    content: '路灯已完成维修，请确认夜间是否正常亮起，如仍有问题可再次上报。',
    isRead: true,
    time: '2026-05-20T20:15',
  },
];
