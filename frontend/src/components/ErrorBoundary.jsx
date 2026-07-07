import React from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: '40px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FCEAEA 0%, #F5C6C6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <FaExclamationTriangle size={28} color="#C0392B" />
          </div>
          <h3 style={{ fontSize: '18px', color: '#1A1A2E', marginBottom: '8px' }}>
            页面出现异常
          </h3>
          <p style={{ fontSize: '13px', color: '#8C9AAF', marginBottom: '20px', maxWidth: '400px', lineHeight: '1.7' }}>
            很抱歉，当前页面渲染时遇到了错误。您可以尝试刷新页面恢复。
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid #E4E7ED',
                background: '#fff', color: '#5A6A7A', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #3858E6 0%, #1B3A5C 100%)',
                color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <FaRedo size={11} /> 刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
