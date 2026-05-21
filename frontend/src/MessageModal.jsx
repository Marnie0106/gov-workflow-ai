import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MessageModal({ ticketId, open, onClose, onSend, messages }) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      const fetchMessages = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/api/messages?ticketId=${ticketId}`);
          setLocalMessages(res.data);
        } catch (err) {
          console.error('加载留言失败', err);
        } finally {
          setLoading(false);
        }
      };
      fetchMessages();
    } else {
      setLocalMessages([]);
    }
  }, [open, ticketId]);

  useEffect(() => {
    if (messages && messages.length) {
      setLocalMessages(messages);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    // 乐观更新
    setLocalMessages(prev => [...prev, {
      id: Date.now(),
      ticket_id: ticketId,
      content: input,
      created_at: new Date().toISOString(),
      sender_role: 'citizen',
      sender_name: '市民'
    }]);
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <h3>工单 #{ticketId} 留言板</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && <p>加载中...</p>}
          {localMessages.length === 0 && !loading && <p>暂无留言，发送第一条吧</p>}
          {localMessages.map(msg => (
            <div key={msg.id} style={{
              marginBottom: '12px',
              padding: '8px 12px',
              background: msg.sender_role === 'citizen' ? '#e8f4fd' : '#f0f0f0',
              borderRadius: '12px',
              alignSelf: msg.sender_role === 'citizen' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{ fontSize: '12px', color: '#888' }}>{msg.sender_name} · {new Date(msg.created_at).toLocaleString()}</div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入留言..."
            style={{ flex: 1, padding: '10px', borderRadius: '30px', border: '1px solid #ddd' }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} style={{ padding: '8px 20px', borderRadius: '30px', background: '#409EFF', color: '#fff', border: 'none', cursor: 'pointer' }}>发送</button>
        </div>
      </div>
    </div>
  );
}