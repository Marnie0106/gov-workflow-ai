import React, { useState, useEffect, useRef } from 'react';
import { getStatistics } from '../api';
import * as echarts from 'echarts';

/* ── 获取当前用户信息 ── */
function getUserName() {
  return sessionStorage.getItem('displayName') || '领导';
}

/* ─────────────────────────────────────────────
   领导工作台
───────────────────────────────────────────── */
export default function LeaderPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const ratingChartRef = useRef(null);

  useEffect(() => {
    getStatistics()
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  // 图表渲染
  useEffect(() => {
    if (!stats) return;

    const colors = ['#1658AF', '#27AE60', '#E67E22', '#8E44AD', '#E74C3C', '#F5A623', '#C0392B'];

    // ── 工单分类饼图 ──
    if (pieChartRef.current) {
      const pie = echarts.init(pieChartRef.current);
      const catData = stats.categoryStats || {};
      pie.setOption({
        title: { text: '工单类型分布', left: 'center', textStyle: { fontSize: 15, fontWeight: 700, color: '#1a2a3a' } },
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        color: colors,
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['50%', '55%'],
          label: { fontSize: 12 },
          data: Object.entries(catData).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
        }]
      });
      window.addEventListener('resize', () => pie.resize());
    }

    // ── 工单状态柱状图 ──
    if (barChartRef.current) {
      const bar = echarts.init(barChartRef.current);
      bar.setOption({
        title: { text: '工单状态统计', left: 'center', textStyle: { fontSize: 15, fontWeight: 700, color: '#1a2a3a' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['总工单', '已完成', '待派单', '处置中', '超时'],
          axisLabel: { fontSize: 12, color: '#606266' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 12 } },
        series: [{
          type: 'bar',
          data: [
            { value: stats.total || 0, itemStyle: { color: '#1658AF' } },
            { value: stats.completed || 0, itemStyle: { color: '#27AE60' } },
            { value: stats.pending || 0, itemStyle: { color: '#E67E22' } },
            { value: stats.processing || 0, itemStyle: { color: '#8E44AD' } },
            { value: stats.timeout || 0, itemStyle: { color: '#E74C3C' } },
          ],
          barWidth: '40%',
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        }],
        grid: { top: 40, bottom: 30, left: 40, right: 20 },
      });
      window.addEventListener('resize', () => bar.resize());
    }

    // ── 星期处理时长折线图 ──
    if (lineChartRef.current) {
      const line = echarts.init(lineChartRef.current);
      const weekData = stats.weekHours || {};
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      line.setOption({
        title: { text: '各工作日平均处理时长（小时）', left: 'center', textStyle: { fontSize: 15, fontWeight: 700, color: '#1a2a3a' } },
        tooltip: { trigger: 'axis', formatter: '{b}: {c} 小时' },
        xAxis: {
          type: 'category', data: days,
          axisLabel: { fontSize: 12, color: '#606266' },
        },
        yAxis: { type: 'value', name: '小时', axisLabel: { fontSize: 12 } },
        series: [{
          type: 'line', data: days.map(d => weekData[d] || 0),
          smooth: true,
          lineStyle: { color: '#1658AF', width: 3 },
          itemStyle: { color: '#1658AF' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(22,88,175,0.3)' },
              { offset: 1, color: 'rgba(22,88,175,0.05)' },
            ]),
          },
        }],
        grid: { top: 40, bottom: 30, left: 50, right: 20 },
      });
      window.addEventListener('resize', () => line.resize());
    }

    // ── 评价统计 ──
    if (ratingChartRef.current) {
      const rate = echarts.init(ratingChartRef.current);
      const ratingStats = stats.ratingStats || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const totalRatings = Object.values(ratingStats).reduce((a, b) => a + b, 0);
      const avgRating = totalRatings > 0
        ? (Object.entries(ratingStats).reduce((sum, [star, count]) => sum + star * count, 0) / totalRatings).toFixed(1)
        : '0.0';

      rate.setOption({
        title: { text: '满意度评价分布', left: 'center', textStyle: { fontSize: 15, fontWeight: 700, color: '#1a2a3a' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['1星', '2星', '3星', '4星', '5星'],
          axisLabel: { fontSize: 12, color: '#606266' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 12 } },
        series: [{
          type: 'bar',
          data: [1, 2, 3, 4, 5].map(n => ({
            value: ratingStats[n] || 0,
            itemStyle: { color: n >= 4 ? '#27AE60' : n === 3 ? '#E67E22' : '#E74C3C' },
          })),
          barWidth: '40%',
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top', fontSize: 12, fontWeight: 600 },
        }],
        graphic: [{
          type: 'text', right: 30, top: 15,
          style: {
            text: `平均 ${avgRating} 分\n共 ${totalRatings} 条评价`,
            fontSize: 13, color: '#606266', textAlign: 'right', lineHeight: 20,
          }
        }],
        grid: { top: 50, bottom: 30, left: 40, right: 100 },
      });
      window.addEventListener('resize', () => rate.resize());
    }

    return () => {
      window.removeEventListener('resize', () => {});
    };
  }, [stats]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#909399' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        正在加载领导看板…
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#E74C3C' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        数据加载失败，请检查后端服务是否正常运行
      </div>
    );
  }

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
  const totalRatings = Object.values(stats.ratingStats || {}).reduce((a, b) => a + b, 0);
  const avgRating = totalRatings > 0
    ? (Object.entries(stats.ratingStats || {}).reduce((sum, [star, count]) => sum + star * count, 0) / totalRatings).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a2a3a', marginBottom: '4px' }}>
            📊 领导看板
          </h2>
          <p style={{ fontSize: '13px', color: '#909399' }}>
            {getUserName()} · 数据概览与趋势分析
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1.5px solid #e4e7ed', background: '#fff',
            color: '#606266', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          🔄 刷新数据
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: '总工单', value: stats.total, color: '#1658AF', icon: '📋' },
          { label: '完成率', value: `${completionRate}%`, color: '#27AE60', icon: '✅' },
          { label: '处置中', value: stats.processing, color: '#8E44AD', icon: '⏳' },
          { label: '超时工单', value: stats.timeout, color: '#E74C3C', icon: '⚠️' },
          { label: '满意度', value: `${avgRating} 分`, color: '#F5A623', icon: '⭐' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff', borderRadius: '14px',
              padding: '18px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `${s.color}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#909399', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 工单类型分布 */}
        <div
          style={{
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '20px',
          }}
        >
          <div ref={pieChartRef} style={{ width: '100%', height: '320px' }} />
        </div>

        {/* 工单状态统计 */}
        <div
          style={{
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '20px',
          }}
        >
          <div ref={barChartRef} style={{ width: '100%', height: '320px' }} />
        </div>

        {/* 星期处理时长 */}
        <div
          style={{
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '20px',
          }}
        >
          <div ref={lineChartRef} style={{ width: '100%', height: '320px' }} />
        </div>

        {/* 评价分布 */}
        <div
          style={{
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '20px',
          }}
        >
          <div ref={ratingChartRef} style={{ width: '100%', height: '320px' }} />
        </div>
      </div>
    </div>
  );
}
