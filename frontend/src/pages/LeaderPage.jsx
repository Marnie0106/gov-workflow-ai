import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getStatistics, getHotTopics, getTimeoutTickets, getWeeklySummary } from '../api';
import * as echarts from 'echarts';
import { FaFire, FaRobot, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import { getUserName, Loading } from '../components/Common';

export default function LeaderPage() {
  const [stats, setStats] = useState(null);
  const [hotTopics, setHotTopics] = useState([]);
  const [timeoutList, setTimeoutList] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartTab, setChartTab] = useState(0); // 0=工单分析, 1=时间分析, 2=满意度
  const [showAllTimeout, setShowAllTimeout] = useState(false); // 超时预警折叠

  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const ratingChartRef = useRef(null);
  // 保存 ECharts 实例引用用于 cleanup
  const chartInstances = useRef([]);

  useEffect(() => {
    Promise.all([
      getStatistics(),
      getHotTopics(),
      getTimeoutTickets(),
    ])
      .then(([s, h, t]) => {
        setStats(s);
        setHotTopics(Array.isArray(h) ? h : []);
        setTimeoutList(Array.isArray(t) ? t : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  // AI 摘要单独加载
  useEffect(() => {
    if (!stats) return;
    setSummaryLoading(true);
    getWeeklySummary()
      .then(d => setAiSummary(d?.summary || ''))
      .catch(() => setAiSummary(''))
      .finally(() => setSummaryLoading(false));
  }, [stats]);

  const handleResize = useCallback(() => {
    chartInstances.current.forEach(c => {
      try { c.resize(); } catch {}
    });
  }, []);

  useEffect(() => {
    if (!stats) return;

    const colors = ['#1B3A5C', '#1E8449', '#D4880F', '#7C3AED', '#C0392B', '#C5A55A', '#2A5A8C'];

    // 清理旧实例
    chartInstances.current.forEach(c => {
      try { c.dispose(); } catch {}
    });
    chartInstances.current = [];

    if (pieChartRef.current) {
      const pie = echarts.init(pieChartRef.current);
      chartInstances.current.push(pie);
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
    }

    if (barChartRef.current) {
      const bar = echarts.init(barChartRef.current);
      chartInstances.current.push(bar);
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
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        }],
        grid: { top: 40, bottom: 30, left: 40, right: 20 },
      });
    }

    if (lineChartRef.current) {
      const line = echarts.init(lineChartRef.current);
      chartInstances.current.push(line);
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
    }

    if (ratingChartRef.current) {
      const rate = echarts.init(ratingChartRef.current);
      chartInstances.current.push(rate);
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
          itemStyle: { borderRadius: [4, 4, 0, 0] },
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
    }

    // 注册 resize 监听
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstances.current.forEach(c => {
        try { c.dispose(); } catch {}
      });
      chartInstances.current = [];
    };
  }, [stats, handleResize]);

  // Tab 切换时重新调整图表尺寸（解决切换后空白问题）
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已更新
    const timer = setTimeout(() => {
      chartInstances.current.forEach(c => {
        try { c.resize(); } catch {}
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [chartTab]);

  if (loading) return <Loading text="正在加载领导看板…" />;

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

  const maxTopicVal = Math.max(1, ...hotTopics.map(t => t.value));

  return (
    <div style={{ position: 'relative' }}>
      {/* 页头 — 固定式标题区 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap:'wrap', gap:'12px',
        background: 'linear-gradient(135deg, #1B3A5C 0%, #2A5A8C 100%)',
        borderRadius: '12px', padding: '18px 22px',
        boxShadow: '0 4px 16px rgba(27,58,92,0.25)',
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing:'1px' }}>
            领导看板
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
            {getUserName('领导')} · 数据概览与趋势分析
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{
            padding: '9px 20px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', display:'flex', alignItems:'center', gap:'6px',
            transition:'all 0.2s', backdropFilter:'blur(4px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor='#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.4)'; }}
        >
          <FaRedo size={12} /> 刷新数据
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px', marginBottom: '20px',
      }}>
        {[
          { label: '总工单', value: stats.total, color: '#1B3A5C', icon: '总', gradient: 'linear-gradient(135deg, #1B3A5C 0%, #2A5A8C 100%)' },
          { label: '完成率', value: `${completionRate}%`, color: '#1E8449', icon: '完', gradient: 'linear-gradient(135deg, #1E8449 0%, #2ECC71 100%)' },
          { label: '处置中', value: stats.processing, color: '#7C3AED', icon: '处', gradient: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' },
          { label: '超时工单', value: stats.timeout, color: '#C0392B', icon: '超', gradient: 'linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)' },
          { label: '满意度', value: `${avgRating} 分`, color: '#C5A55A', icon: '评', gradient: 'linear-gradient(135deg, #C5A55A 0%, #F0C060 100%)' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff', borderRadius: '12px',
              padding: '16px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px',
              border:'1px solid #EDF2F7',
              transition:'all 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: s.gradient, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              fontWeight:'700', color:'#fff',
              boxShadow: `0 2px 8px ${s.color}40`,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#8C9AAF', marginTop: '1px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI 周报摘要 + 问题热榜 横向并排 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '14px', marginBottom: '14px',
      }}>
        {/* AI 周报摘要 */}
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)',
          borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '18px 20px', border: '1px solid #E0E7FF',
          minHeight: '200px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{
              width:'32px', height:'32px', borderRadius:'8px',
              background:'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 6px rgba(124,58,237,0.3)',
            }}>
              <FaRobot size={14} color="#fff" />
            </div>
            <div>
              <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1A1A2E', margin:0 }}>AI 智能周报</h4>
              <span style={{ fontSize:'11px', color:'#8C9AAF' }}>基于本周数据自动生成</span>
            </div>
          </div>
          {summaryLoading ? (
            <div style={{ textAlign:'center', padding:'30px 0', color:'#8C9AAF', fontSize:'13px' }}>
              <div style={{ width:'24px', height:'24px', border:'2px solid #EDF2F7', borderTopColor:'#3858E6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <div>AI 正在分析数据…</div>
            </div>
          ) : aiSummary ? (
            <p style={{
              fontSize:'13px', color:'#2D3748', lineHeight:'1.9',
              margin:0, textIndent:'2em',
              background:'rgba(255,255,255,0.7)', borderRadius:'8px',
              padding:'12px 14px', border:'1px solid #E0E7FF',
            }}>
              {aiSummary}
            </p>
          ) : (
            <div style={{ textAlign:'center', padding:'30px 0', color:'#8C9AAF', fontSize:'13px' }}>
              AI 摘要暂不可用
            </div>
          )}
        </div>

        {/* 问题热榜 */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          padding: '18px 20px', border: '1px solid #EDF2F7',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{
              width:'32px', height:'32px', borderRadius:'8px',
              background:'linear-gradient(135deg, #E74C3C 0%, #F39C12 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 6px rgba(231,76,60,0.3)',
            }}>
              <FaFire size={14} color="#fff" />
            </div>
            <div>
              <h4 style={{ fontSize:'15px', fontWeight:'700', color:'#1A1A2E', margin:0 }}>问题热榜</h4>
              <span style={{ fontSize:'11px', color:'#8C9AAF' }}>本月市民最关注问题</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {hotTopics.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', color:'#8C9AAF', fontSize:'13px' }}>暂无数据</div>
            ) : (
              hotTopics.map((topic, idx) => {
                const pct = Math.round((topic.value / maxTopicVal) * 100);
                const colors = ['#E74C3C', '#F39C12', '#D4880F', '#1E8449', '#2A5A8C', '#7C3AED'];
                const barColor = colors[idx % colors.length];
                return (
                  <div key={topic.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'12px' }}>
                      <span style={{ fontWeight:'600', color:'#1A1A2E', display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{
                          width:'18px', height:'18px', borderRadius:'4px',
                          background: idx < 3 ? barColor : '#CBD5E0',
                          color:'#fff', fontSize:'10px', fontWeight:'700',
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                        }}>{idx + 1}</span>
                        {topic.name}
                      </span>
                      <span style={{ color:'#5A6A7A', fontWeight:'600' }}>{topic.value} 件</span>
                    </div>
                    <div style={{
                      height:'6px', borderRadius:'3px', background:'#EDF2F7', overflow:'hidden',
                    }}>
                      <div style={{
                        height:'100%', borderRadius:'3px',
                        width:`${pct}%`,
                        background:`linear-gradient(90deg, ${barColor} 0%, ${barColor}99 100%)`,
                        transition:'width 0.6s ease',
                        boxShadow: `0 1px 3px ${barColor}40`,
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 超时预警墙 — 默认折叠，超过5条只显示前5条 */}
      {timeoutList.length > 0 && (
        <div style={{
          background:'#FFF5F5', borderRadius:'12px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
          padding:'14px 20px', border:'1px solid #FECACA',
          marginBottom:'14px',
        }}>
          <div
            style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: showAllTimeout ? '12px' : '0', cursor:'pointer' }}
            onClick={() => setShowAllTimeout(!showAllTimeout)}
          >
            <div style={{
              width:'28px', height:'28px', borderRadius:'6px',
              background:'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 6px rgba(220,38,38,0.3)',
            }}>
              <FaExclamationTriangle size={12} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize:'14px', fontWeight:'700', color:'#991B1B', margin:0 }}>超时预警</h4>
              <span style={{ fontSize:'11px', color:'#DC2626' }}>{timeoutList.length} 条工单超过 24 小时未完结</span>
            </div>
            <span style={{ fontSize:'12px', color:'#DC2626', fontWeight:'600' }}>
              {showAllTimeout ? '收起 ▲' : '展开 ▼'}
            </span>
          </div>
          {showAllTimeout && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', animation: 'fadeIn 0.25s ease' }}>
              {timeoutList.map(t => (
                <div key={t.id} style={{
                  background:'#fff', borderRadius:'8px', padding:'8px 14px',
                  border:'1px solid #FECACA', fontSize:'12px',
                  display:'flex', alignItems:'center', gap:'8px',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <span style={{ fontWeight:'700', color:'#DC2626' }}>#{t.id}</span>
                  <span style={{ color:'#1A1A2E' }}>{t.title?.slice(0, 15)}{(t.title||'').length > 15 ? '…' : ''}</span>
                  <span style={{ color:'#8C9AAF' }}>{t.location}</span>
                  {t.department && <span style={{
                    background:'#FEF3C7', color:'#92400E', borderRadius:'4px',
                    padding:'1px 6px', fontSize:'10px', fontWeight:'600',
                  }}>{t.department}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 图表区域 — Tab 切换，避免同时渲染4个ECharts */}
      <div style={{
        background: '#fff', borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: '1px solid #EDF2F7', overflow: 'hidden',
      }}>
        {/* Tab 标签 */}
        <div style={{ display:'flex', borderBottom:'2px solid #E5E7EB', background:'#F9FAFB', borderRadius:'12px 12px 0 0' }}>
          {[
            { idx: 0, label: '工单分析' },
            { idx: 1, label: '时间分析' },
            { idx: 2, label: '满意度' },
          ].map(t => (
            <button
              key={t.idx}
              onClick={() => setChartTab(t.idx)}
              style={{
                padding: '14px 32px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: chartTab === t.idx ? '700' : '500',
                color: chartTab === t.idx ? '#1B3A5C' : '#6B7280',
                background: chartTab === t.idx ? '#fff' : 'transparent',
                borderBottom: chartTab === t.idx ? '3px solid #1B3A5C' : '3px solid transparent',
                borderTop: chartTab === t.idx ? '3px solid transparent' : '3px solid transparent',
                transition: 'all 0.3s',
                position: 'relative', top: '2px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* 图表内容 — 只渲染当前Tab */}
        <div style={{ padding: '16px' }}>
          {chartTab === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
              <div ref={pieChartRef} style={{ width: '100%', height: '300px' }} />
              <div ref={barChartRef} style={{ width: '100%', height: '300px' }} />
            </div>
          )}
          {chartTab === 1 && (
            <div ref={lineChartRef} style={{ width: '100%', height: '340px' }} />
          )}
          {chartTab === 2 && (
            <div ref={ratingChartRef} style={{ width: '100%', height: '340px' }} />
          )}
        </div>
      </div>
    </div>
  );
}
