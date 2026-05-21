import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';

// 初始默认流程（市容巡查标准流程）
const initialNodes = [
  { id: '1', position: { x: 100, y: 100 }, data: { label: '工单创建' }, type: 'input' },
  { id: '2', position: { x: 300, y: 100 }, data: { label: '派单' } },
  { id: '3', position: { x: 500, y: 100 }, data: { label: '接单' } },
  { id: '4', position: { x: 700, y: 100 }, data: { label: '现场处置' } },
  { id: '5', position: { x: 900, y: 100 }, data: { label: '结果上报' } },
  { id: '6', position: { x: 1100, y: 100 }, data: { label: '审核' } },
  { id: '7', position: { x: 1300, y: 100 }, data: { label: '归档' }, type: 'output' },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5' },
  { id: 'e5-6', source: '5', target: '6' },
  { id: 'e6-7', source: '6', target: '7' },
];

const FlowEditor = forwardRef((props, ref) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [nlpDescription, setNlpDescription] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await axios.get('/api/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('加载模板失败', err);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const saveTemplate = async () => {
    const name = prompt('请输入模板名称', '市容巡查标准流程');
    if (!name) return;
    const flowJson = JSON.stringify({ nodes, edges });
    try {
      await axios.post('/api/templates', { name, flowJson });
      alert('保存成功');
      loadTemplates();
    } catch (err) {
      console.error('保存失败', err);
      alert('保存失败');
    }
  };

  const loadTemplate = async () => {
    if (!selectedTemplate) return;
    const template = templates.find(t => t.id == selectedTemplate);
    if (template && template.flowJson) {
      const { nodes: loadedNodes, edges: loadedEdges } = JSON.parse(template.flowJson);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
    }
  };

  const generateFlowFromText = async () => {
    if (!nlpDescription.trim()) {
      alert('请输入流程描述');
      return;
    }
    try {
      const res = await axios.post('/api/ai/generateFlow', { description: nlpDescription });
      let { nodes: generatedNodes, edges: generatedEdges } = res.data;
      const normalizedNodes = generatedNodes.map((node, idx) => {
        const label = node.label || node.data?.label || `节点${idx+1}`;
        return {
          id: node.id || String(idx + 1),
          position: { x: 100 + (idx % 5) * 200, y: Math.floor(idx / 5) * 120 },
          data: { label },
          type: idx === 0 ? 'input' : (idx === generatedNodes.length - 1 ? 'output' : undefined),
        };
      });
      const normalizedEdges = generatedEdges.map((edge, idx) => ({
        id: `e${idx}`,
        source: edge.source,
        target: edge.target,
      }));
      setNodes(normalizedNodes);
      setEdges(normalizedEdges);
      alert(`生成成功，共 ${normalizedNodes.length} 个节点`);
    } catch (err) {
      console.error('生成失败', err);
      alert('生成失败，请检查后端服务是否正常，或稍后重试');
    }
  };

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    getFlow: () => {
      // 返回当前流程的节点和边（用于绑定到工单）
      return { nodes, edges };
    },
    setFlow: (flow) => {
      if (flow.nodes) setNodes(flow.nodes);
      if (flow.edges) setEdges(flow.edges);
    }
  }));

  return (
    <div style={{ height: '600px', border: '1px solid #ccc', marginTop: '20px' }}>
      <div style={{ padding: '8px', backgroundColor: '#f5f5f5' }}>
        <button onClick={saveTemplate} style={{ marginRight: '10px' }}>保存当前流程为模板</button>
        <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} style={{ marginRight: '10px' }}>
          <option value="">-- 选择模板加载 --</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button onClick={loadTemplate} style={{ marginRight: '10px' }}>加载选中模板</button>
      </div>
      <div style={{ padding: '8px', backgroundColor: '#e9ecef', borderTop: '1px solid #ccc' }}>
        <textarea
          rows="2"
          cols="60"
          placeholder="输入自然语言流程描述，例如：夜市占道投诉，先派城管核实，若属实转处置，否则驳回"
          value={nlpDescription}
          onChange={(e) => setNlpDescription(e.target.value)}
          style={{ marginRight: '10px', verticalAlign: 'top' }}
        />
        <button onClick={generateFlowFromText}>✨ 自然语言生成流程</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
});

export default FlowEditor;