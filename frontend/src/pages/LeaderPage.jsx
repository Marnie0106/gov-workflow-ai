import React, { useState, useEffect, useRef } from 'react';
import { getStatistics } from '../api';
import * as echarts from 'echarts';

function getUserName() {
  return sessionStorage.getItem('displayName') || '领导';
}

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

  useEffect(() => {
    if (!stats) return;

    const colors = ['#1B3A5C', '#1E8449', '#D4880F', '#7C3AED', '#C0392B', '#C5A55A', '#2A5A8C'];

    if (pieChartRef.current) {
      const pie = echarts.init(pieChartRef.current);
      const catData = stats.categoryStats || {};
      pie.setOption({
        title: { text: '工单类型分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#1A1A2E' } },
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        color: colors,
        series: [{
          type: 'pie', radius: ['40%', '70%'], center: ['50%', '55%'],
          label: { fontSize: 11 },
          data: Object.entries(catData).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
        }]
      });
      window.addEventListener('resize', () => pie.resize());
    }

    if (barChartRef.current) {
      const bar = echarts.init(barChartRef.current);
      bar.setOption({
        title: { text: '工单状态统计', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#1A1A2E' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['总工单', '已完成', '待派单', '处置中', '超时'],
          axisLabel: { fontSize: 11, color: '#5A6A7A' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar',
          data: [
            { value: stats.total || 0, itemStyle: { color: '#1B3A5C' } },
            { value: stats.completed || 0, itemStyle: { color: '#1E8449' } },
            { value: stats.pending || 0, itemStyle: { color: '#D4880F' } },
            { value: stats.processing || 0, itemStyle: { color: '#7C3AED' } },
            { value: stats.timeout || 0, itemStyle: { color: '#C0392B' } },
          ],
          barWidth: '40%',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
        }],
        grid: { top: 40, bottom: 30, left: 40, right: 20 },
      });
      window.addEventListener('resize', () => bar.resize());
    }

    if (lineChartRef.current) {
      const line = echarts.init(lineChartRef.current);
      const weekData = stats.weekHours || {};
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      line.setOption({
        title: { text: '各工作日平均处理时长（小时）', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#1A1A2E' } },
        tooltip: { trigger: 'axis', formatter: '{b}: {c} 小时' },
        xAxis: {
          type: 'category', data: days,
          axisLabel: { fontSize: 11, color: '#5A6A7A' },
        },
        yAxis: { type: 'value', name: '小时', axisLabel: { fontSize: 11 } },
        series: [{
          type: 'line', data: days.map(d => weekData[d] || 0),
          smooth: true,
          lineStyle: { color: '#1B3A5C', width: 2 },
          itemStyle: { color: '#1B3A5C' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(27,58,92,0.2)' },
              { offset: 1, color: 'rgba(27,58,92,0.02)' },
            ]),
          },
        }],
        grid: { top: 40, bottom: 30, left: 50, right: 20 },
      });
      window.addEventListener('resize', () => line.resize());
    }

    if (ratingChartRef.current) {
      const rate = echarts.init(ratingChartRef.current);
      const ratingStats = stats.ratingStats || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const totalRatings = Object.values(ratingStats).reduce((a, b) => a + b, 0);
      const avgRating = totalRatings > 0
        ? (Object.entries(ratingStats).reduce((sum, [star, count]) => sum + star * count, 0) / totalRatings).toFixed(1)
        : '0.0';

      rate.setOption({
        title: { text: '满意度评价分布', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#1A1A2E' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: ['1星', '2星', '3星', '4星', '5星'],
          axisLabel: { fontSize: 11, color: '#5A6A7A' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar',
          data: [1, 2, 3, 4, 5].map(n => ({
            value: ratingStats[n] || 0,
            itemStyle: { color: n >= 4 ? '#1E8449' : n === 3 ? '#D4880F' : '#C0392B' },
          })),
          barWidth: '40%',
          itemStyle: { borderRadius: [2, 2, 0, 0] },
          label: { show: true, position: 'top', fontSize: 11, fontWeight: 600 },
        }],
        graphic: [{
          type: 'text', right: 30, top: 15,
          style: {
            text: `平均 ${avgRating} 分\n共 ${totalRatings} 条评价`,
            fontSize: 12, color: '#5A6A7A', textAlign: 'right', lineHeight: 18,
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
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#8C9AAF' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px', opacity:0.5 }}>加载中</div>
        正在加载领导看板…
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#C0392B' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px', opacity:0.5 }}>!</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A2E', marginBottom: '4px', letterSpacing:'0.5px' }}>
            领导看板
          </h2>
          <p style={{ fontSize: '12px', color: '#8C9AAF' }}>
            {getUserName()} · 数据概览与趋势分析
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{
            padding: '6px 14px', borderRadius: '2px',
            border: '1px solid #D9DEE6', background: '#fff',
            color: '#5A6A7A', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          刷新数据
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: '总工单', value: stats.total, color: '#1B3A5C', icon: '总' },
          { label: '完成率', value: `${completionRate}%`, color: '#1E8449', icon: '完' },
          { label: '处置中', value: stats.processing, color: '#7C3AED', icon: '处' },
          { label: '超时工单', value: stats.timeout, color: '#C0392B', icon: '超' },
          { label: '满意度', value: `${avgRating} 分`, color: '#C5A55A', icon: '评' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff', borderRadius: '4px',
              padding: '14px 12px', boxShadow: '0 1px 4px rgba(27,58,92,0.06)',
              display: 'flex', alignItems: 'center', gap: '10px',
              border:'1px solid #E8ECF0',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '2px',
              background: `${s.color}12`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              fontWeight:'700', color:s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '1px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {[
          { ref: pieChartRef },
          { ref: barChartRef },
          { ref: lineChartRef },
          { ref: ratingChartRef },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              background: '#fff', borderRadius: '4px',
              boxShadow: '0 1px 4px rgba(27,58,92,0.06)', padding: '16px',
              border:'1px solid #E8ECF0',
            }}
          >
            <div ref={c.ref} style={{ width: '100%', height: '300px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
