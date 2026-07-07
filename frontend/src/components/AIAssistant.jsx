import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';

// Q 版 AI 助手浮窗组件
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, window.innerWidth - 90),
    y: Math.max(60, window.innerHeight - 180),
  }));
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const chatEndRef = useRef(null);
  const pathRef = useRef(window.location.pathname);

  // 引导语
  useEffect(() => {
    const path = window.location.pathname;
    pathRef.current = path;
    let hint = '';
    if (path.startsWith('/citizen')) hint = '我是小容助手~ 在这里你可以上报市容问题、查看工单进度、给处理结果打分哦！';
    else if (path.startsWith('/dispatcher')) hint = '处置员你好！点开工单卡片可以用 AI 获取处理建议，记得及时更新工单状态~';
    else if (path.startsWith('/process-admin')) hint = '管理员你好！可以管理流程模板、查看所有工单，还能用 AI 生成新的处置流程~';
    else if (path.startsWith('/leader')) hint = '领导你好！看板已更新本周数据，AI 周报和问题热榜帮你快速掌握全局~';
    else hint = '你好！我是小容，市容巡查系统的 AI 助手，有什么可以帮你？';
    setMessages([{ role: 'assistant', content: hint, time: new Date().toISOString() }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - pos.x, y: clientY - pos.y };
    setDragging(true);
  };

  const handleDragMove = (e) => {
    if (!dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 60, clientX - dragStart.current.x)),
      y: Math.max(60, Math.min(window.innerHeight - 60, clientY - dragStart.current.y)),
    });
  };

  const handleDragEnd = () => setDragging(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim(), time: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const s = sessionStorage.getItem('session');
      let sessionId = '';
      if (s) { try { sessionId = JSON.parse(s).sessionId || ''; } catch {} }
      
      // 提取最近6条对话消息发送给AI
      const chatHistory = updatedMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session': sessionId },
        body: JSON.stringify({ messages: chatHistory }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || '暂时无法回复，请稍后再试~', time: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '哎呀，网络好像不太稳定，等会儿再问我吧~', time: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Q 版悬浮按钮 */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onClick={() => { if (!dragging) setOpen(!open); }}
        style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          zIndex: 9999,
          cursor: dragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
          transition: dragging ? 'none' : 'transform 0.2s',
        }}
        title="小容 AI 助手 - 可拖拽移动"
      >
        {/* 主体 */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3858E6 0%, #7C3AED 100%)',
          boxShadow: '0 4px 20px rgba(56,88,230,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* 机器人脸 */}
          <FaRobot size={22} color="#fff" />
          {/* 眼睛光点 */}
          <div style={{
            position: 'absolute', top: '15px', left: '18px',
            width: '4px', height: '4px', borderRadius: '50%',
            background: '#fff', opacity: 0.8,
          }} />
          <div style={{
            position: 'absolute', top: '15px', right: '18px',
            width: '4px', height: '4px', borderRadius: '50%',
            background: '#fff', opacity: 0.8,
          }} />
          {/* 微笑弧线 */}
          <div style={{
            position: 'absolute', bottom: '14px',
            width: '14px', height: '6px',
            borderBottom: '2px solid rgba(255,255,255,0.6)',
            borderRadius: '0 0 8px 8px',
          }} />
        </div>

        {/* 呼吸光环 */}
        <div style={{
          position: 'absolute', top: '-6px', left: '-6px',
          width: '68px', height: '68px', borderRadius: '50%',
          border: '2px solid rgba(56,88,230,0.25)',
          animation: 'breathe 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 对话面板 */}
      {open && (
        <div style={{
          position: 'fixed',
          right: '20px', bottom: '90px',
          width: 'min(360px, calc(100vw - 40px))', height: '480px',
          zIndex: 9998,
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #EDF2F7',
          animation: 'slideUp 0.25s ease',
        }}>
          {/* 头部 */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #3858E6 0%, #7C3AED 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaRobot size={18} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>小容助手</div>
                <div style={{ fontSize: '10px', opacity: 0.75 }}>AI 驱动 · 随时为你服务</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', cursor: 'pointer', padding: '4px 8px',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
            }} aria-label="关闭助手">
              <FaTimes size={12} />
            </button>
          </div>

          {/* 消息列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', background: '#F8FAFD' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #3858E6 0%, #7C3AED 100%)'
                    : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1A1A2E',
                  fontSize: '13px', lineHeight: '1.6',
                  boxShadow: m.role === 'user'
                    ? '0 2px 8px rgba(56,88,230,0.3)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  border: m.role === 'user' ? 'none' : '1px solid #EDF2F7',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: '#fff', border: '1px solid #EDF2F7',
                  fontSize: '13px', color: '#8C9AAF',
                }}>
                  <span style={{ display: 'inline-block', animation: 'bounce 1s infinite' }}>●</span>
                  <span style={{ display: 'inline-block', animation: 'bounce 1s infinite 0.2s', marginLeft: '4px' }}>●</span>
                  <span style={{ display: 'inline-block', animation: 'bounce 1s infinite 0.4s', marginLeft: '4px' }}>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入框 */}
          <div style={{
            padding: '10px 14px', borderTop: '1px solid #EDF2F7',
            display: 'flex', gap: '8px', background: '#fff',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="问我任何问题…"
              aria-label="输入消息"
              style={{
                flex: 1, padding: '8px 12px',
                borderRadius: '20px', border: '1px solid #E2E8F0',
                fontSize: '13px', outline: 'none',
                fontFamily: 'inherit', background: '#F8FAFD',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="发送消息"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: input.trim() ? 'linear-gradient(135deg, #3858E6 0%, #7C3AED 100%)' : '#E2E8F0',
                border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() ? '0 2px 8px rgba(56,88,230,0.3)' : 'none',
              }}
            >
              <FaPaperPlane size={12} color={input.trim() ? '#fff' : '#A0AEC0'} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
