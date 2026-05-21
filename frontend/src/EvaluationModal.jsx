import React, { useState } from 'react';

export default function EvaluationModal({ ticketId, open, onClose, onSubmit }) {
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(ticketId, rating, comment);
      onClose();
    } catch (err) {
      alert('评价提交失败');
    } finally {
      setSubmitting(false);
    }
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
        width: '400px',
        maxWidth: '90%',
        padding: '24px'
      }}>
        <h3 style={{ marginBottom: '16px' }}>评价工单 #{ticketId}</h3>
        <div style={{ marginBottom: '16px' }}>
          <label>星级评分</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                onClick={() => setRating(star)}
                style={{
                  fontSize: '32px',
                  cursor: 'pointer',
                  color: star <= rating ? '#FFD700' : '#ccc'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
            {rating === 1 && '特别差'} {rating === 2 && '差'} {rating === 3 && '一般'} {rating === 4 && '良好'} {rating === 5 && '优秀'}
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label>评语（可选）</label>
          <textarea
            rows="3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '8px' }}
            placeholder="请填写您的意见..."
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '30px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>取消</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 20px', borderRadius: '30px', background: '#409EFF', color: '#fff', border: 'none', cursor: 'pointer' }}>提交</button>
        </div>
      </div>
    </div>
  );
}