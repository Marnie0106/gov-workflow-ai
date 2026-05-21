import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

// 标准节点顺序（用于判断已完成/进行中/未开始）——仅当没有绑定的流程时使用
const defaultNodeOrder = [
  '工单创建', '派单', '接单', '现场处置', '结果上报', '审核', '归档'
];

export default function WorkflowProgress({ ticket, templateFlow, onStepComplete, currentUserRole }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (!templateFlow || !templateFlow.nodes) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 获取工单的进度状态（从后端传来的 flow_progress）
    let savedProgress = {};
    if (ticket?.flow_progress) {
      savedProgress = ticket.flow_progress;
    }
    setProgress(savedProgress);
    
    const currentNodeLabel = ticket?.currentNode || null;
    let currentIndex = -1;
    if (currentNodeLabel) {
      currentIndex = defaultNodeOrder.indexOf(currentNodeLabel);
    }
    
    // 为每个节点设置样式，并根据进度状态显示“完成”按钮（仅处置人员）
    const styledNodes = templateFlow.nodes.map((node, idx) => {
      const nodeLabel = node.data.label;
      const nodeId = node.id;
      // 判断该步骤是否已完成（从 progress 中读取）
      const stepKey = `step${idx}`;
      const isCompleted = progress[stepKey] === true;
      
      let backgroundColor = '#ffffff';
      // 如果使用默认顺序且没有绑定进度，则根据 currentIndex 高亮
      if (savedProgress && Object.keys(savedProgress).length === 0 && currentIndex !== -1) {
        const nodeIndex = defaultNodeOrder.indexOf(nodeLabel);
        if (nodeIndex === currentIndex) backgroundColor = '#fff3bf';
        else if (nodeIndex !== -1 && nodeIndex < currentIndex) backgroundColor = '#d4edda';
      } else if (isCompleted) {
        backgroundColor = '#d4edda'; // 绿色已完成
      } else if (stepKey === Object.keys(progress).find(k => progress[k] === false)) {
        // 第一个未完成的步骤作为当前节点
        backgroundColor = '#fff3bf';
      }
    
      // 超时/重复标记
      if (ticket?.isTimeout && nodeLabel === '派单') backgroundColor = '#f8d7da';
      if (ticket?.isDuplicate && nodeLabel === '工单创建') backgroundColor = '#f8d7da';
    
      return {
        ...node,
        style: { backgroundColor, border: '1px solid #555', padding: 10, borderRadius: '8px' },
        data: {
          ...node.data,
          label: (
            <div>
              <div>{nodeLabel}</div>
              {currentUserRole === '工单处置人员' && !isCompleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStepComplete) onStepComplete(idx);
                  }}
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#409EFF',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  完成此步
                </button>
              )}
              {isCompleted && <span style={{ fontSize: '12px', color: '#67C23A', marginLeft: '8px' }}>✓</span>}
            </div>
          )
        }
      };
    });
    
    setNodes(styledNodes);
    setEdges(templateFlow.edges || []);
  }, [ticket, templateFlow, onStepComplete, currentUserRole, progress]);

  if (!ticket) {
    return (
      <div style={{ height: '400px', border: '1px solid #ccc', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        请点击工单列表中的“查看进度”按钮以显示流程图
      </div>
    );
  }

  return (
    <div style={{ height: '400px', border: '1px solid #ccc', marginTop: '20px', padding: '10px' }}>
      <h4>工单 #{ticket.id} 进度流程图（当前节点：{ticket.currentNode || '未知'}）</h4>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}