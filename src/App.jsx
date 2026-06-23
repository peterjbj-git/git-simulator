import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, GitCommit, Terminal, AlertTriangle, CheckCircle2, Cloud, GitFork, Download, Upload, Server } from 'lucide-react';

export default function App() {
  const initialState = {
    repoState: {
      hasForked: false,
      hasCloned: false,
    },
    commits: [
      { id: 'C1', parent: null, message: '초기 기획안', lane: 0, y: 60 },
      { id: 'C2', parent: 'C1', message: '시장 분석 추가', lane: 0, y: 150 },
      { id: 'C3', parent: 'C2', message: '예산안 초안', lane: 0, y: 240 }
    ],
    branches: [
      { name: 'upstream/main', target: 'C3', lane: 0, type: 'remote-upstream' }
    ],
    head: null,
    logs: [
      '[System] 시뮬레이터 초기화 완료.',
      '[System] 외부 팀의 원본 저장소(Upstream)를 발견했습니다.',
      '[안내] 작업을 시작하려면 먼저 원본을 내 서버로 Fork 하세요.'
    ],
    commitCounter: 4,
    laneCounter: 1,
    detachedLane: null
  };

  const [state, setState] = useState(initialState);
  const [newBranchName, setNewBranchName] = useState('feature-idea');
  const [hoveredCommit, setHoveredCommit] = useState(null);
  const [hoveredBranch, setHoveredBranch] = useState(null);
  const logsContainerRef = useRef(null);
  const userScrolledUp = useRef(false);

  // 사용자가 직접 위로 스크롤 중이면 자동 하강 억제
  const handleTerminalScroll = () => {
    const el = logsContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    userScrolledUp.current = !atBottom;
  };

  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el || userScrolledUp.current) return;
    el.scrollTop = el.scrollHeight;
  }, [state.logs]);

  const getCurrentCommitId = (s = state) => {
    if (!s.head) return null;
    if (s.head.type === 'commit') return s.head.target;
    const branch = s.branches.find(b => b.name === s.head.target);
    return branch ? branch.target : null;
  };

  /* ================= 협업(Remote) 액션 ================= */

  const handleFork = () => {
    const upstreamMain = state.branches.find(b => b.name === 'upstream/main');
    setState(prev => ({
      ...prev,
      repoState: { ...prev.repoState, hasForked: true },
      branches: [
        ...prev.branches,
        { name: 'origin/main', target: upstreamMain.target, lane: 0, type: 'remote-origin' }
      ],
      logs: [
        ...prev.logs,
        '$ git fork',
        '[성공] 원본 저장소를 내 원격 서버(origin)로 복사(Fork)했습니다.',
        '[안내] 이제 내 컴퓨터로 다운로드(Clone) 하세요.'
      ]
    }));
  };

  const handleClone = () => {
    const originMain = state.branches.find(b => b.name === 'origin/main');
    setState(prev => ({
      ...prev,
      repoState: { ...prev.repoState, hasCloned: true },
      branches: [
        ...prev.branches,
        { name: 'main', target: originMain.target, lane: 0, type: 'local' }
      ],
      head: { type: 'branch', target: 'main' },
      logs: [
        ...prev.logs,
        '$ git clone <origin-url>',
        '[성공] 내 서버(origin)의 데이터를 내 컴퓨터(Local)로 가져왔습니다.',
        '[안내] 정상적인 작업 환경이 구축되었습니다. (HEAD 부착됨)'
      ]
    }));
  };

  const handlePush = () => {
    if (state.head.type !== 'branch') {
      setState(prev => ({ ...prev, logs: [...prev.logs, '[오류] Detached HEAD 상태에서는 Push할 수 없습니다.'] }));
      return;
    }

    const localBranchName = state.head.target;
    const remoteBranchName = `origin/${localBranchName}`;
    const localBranch = state.branches.find(b => b.name === localBranchName);

    setState(prev => {
      let newBranches = [...prev.branches];
      const remoteExists = newBranches.some(b => b.name === remoteBranchName);

      if (remoteExists) {
        newBranches = newBranches.map(b =>
          b.name === remoteBranchName ? { ...b, target: localBranch.target } : b
        );
      } else {
        newBranches.push({ name: remoteBranchName, target: localBranch.target, lane: localBranch.lane, type: 'remote-origin' });
      }

      return {
        ...prev,
        branches: newBranches,
        logs: [
          ...prev.logs,
          `$ git push origin ${localBranchName}`,
          `[성공] 로컬의 '${localBranchName}' 변경사항을 원격 서버(origin)에 동기화했습니다.`
        ]
      };
    });
  };

  /* ================= 로컬(Local) 액션 ================= */

  const handleCommit = () => {
    if (!state.repoState.hasCloned) return;

    const parentId = getCurrentCommitId();
    const newId = `C${state.commitCounter}`;

    let newLane;
    let nextLaneCounter = state.laneCounter;
    let nextDetachedLane = state.detachedLane;

    if (state.head.type === 'branch') {
      const branch = state.branches.find(b => b.name === state.head.target);
      newLane = branch.lane;
    } else {
      if (nextDetachedLane === null) {
        newLane = nextLaneCounter;
        nextDetachedLane = nextLaneCounter;
        nextLaneCounter++;
      } else {
        newLane = nextDetachedLane;
      }
    }

    const maxY = Math.max(...state.commits.map(c => c.y));
    const newY = maxY + 90;

    const newCommit = {
      id: newId,
      parent: parentId,
      message: `로컬 작업물 ${state.commitCounter - 3}`,
      lane: newLane,
      y: newY
    };

    let newBranches = [...state.branches];
    let newHead = { ...state.head };

    if (state.head.type === 'branch') {
      newBranches = newBranches.map(b =>
        b.name === state.head.target ? { ...b, target: newId } : b
      );
    } else {
      newHead = { type: 'commit', target: newId };
    }

    setState(prev => ({
      ...prev,
      commits: [...prev.commits, newCommit],
      branches: newBranches,
      head: newHead,
      commitCounter: prev.commitCounter + 1,
      laneCounter: nextLaneCounter,
      detachedLane: nextDetachedLane,
      logs: [
        ...prev.logs,
        `$ git commit -m "작업 저장 (${newId})"`,
        prev.head.type === 'commit'
          ? '[경고] Detached 상태 커밋 — 브랜치 없이 저장됨 (미아 위험)'
          : '[성공] 내 컴퓨터(로컬)에 커밋이 저장되었습니다.'
      ]
    }));
  };

  // 브랜치 클릭 → 해당 브랜치로 switch (로컬 브랜치만)
  const handleSwitchBranch = (branchName) => {
    const branch = state.branches.find(b => b.name === branchName);
    if (!branch || branch.type !== 'local') return;
    if (state.head?.type === 'branch' && state.head.target === branchName) return;

    setState(prev => ({
      ...prev,
      head: { type: 'branch', target: branchName },
      detachedLane: null,
      logs: [...prev.logs, `$ git switch ${branchName}`, `[성공] '${branchName}' 브랜치로 이동했습니다.`]
    }));
  };

  // 커밋 노드 클릭 → Detached HEAD로 이동
  const handleSwitchDetach = (commitId) => {
    if (!state.repoState.hasCloned) return;
    if (getCurrentCommitId() === commitId && state.head?.type === 'commit') return;

    setState(prev => ({
      ...prev,
      head: { type: 'commit', target: commitId },
      detachedLane: null,
      logs: [
        ...prev.logs,
        `$ git switch --detach ${commitId}`,
        `[경고] HEAD가 '${commitId}' 커밋에 직접 부착됨 (Detached HEAD 상태)`
      ]
    }));
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;

    const currentCommitId = getCurrentCommitId();
    const isFromDetached = state.head.type === 'commit';
    let targetLane = state.laneCounter;
    let nextLaneCounter = state.laneCounter + 1;

    if (isFromDetached && state.detachedLane !== null) {
      targetLane = state.detachedLane;
      nextLaneCounter = state.laneCounter;
    }

    const newBranch = {
      name: newBranchName,
      target: currentCommitId,
      lane: targetLane,
      type: 'local'
    };

    setState(prev => ({
      ...prev,
      branches: [...prev.branches, newBranch],
      head: { type: 'branch', target: newBranchName },
      laneCounter: nextLaneCounter,
      detachedLane: null,
      logs: [
        ...prev.logs,
        `$ git switch -c ${newBranchName}`,
        '[성공] 로컬 새 브랜치 생성 및 HEAD 부착 완료.'
      ]
    }));
    setNewBranchName(`feature-${state.commitCounter}`);
  };

  const handleReset = () => {
    setState(initialState);
    setHoveredCommit(null);
    setHoveredBranch(null);
  };

  /* ================= SVG 유틸 ================= */

  const LANE_W = 150;
  const LANE_X0 = 80;
  const R = 18; // 코너 반경

  const laneX = (lane) => LANE_X0 + lane * LANE_W;

  const drawPath = (parent, child) => {
    const px = laneX(parent.lane);
    const py = parent.y;
    const cx = laneX(child.lane);
    const cy = child.y;

    if (px === cx) {
      return `M ${px} ${py + 15} L ${cx} ${cy - 15}`;
    }

    // 직각 코너 경로 (실제 git 그래프 스타일)
    const branchY = py + Math.max(28, (cy - py) * 0.32);
    const dir = cx > px ? 1 : -1;

    return [
      `M ${px} ${py + 15}`,
      `L ${px} ${branchY - R}`,
      `Q ${px} ${branchY} ${px + dir * R} ${branchY}`,
      `L ${cx - dir * R} ${branchY}`,
      `Q ${cx} ${branchY} ${cx} ${branchY + R}`,
      `L ${cx} ${cy - 15}`,
    ].join(' ');
  };

  const getBranchColor = (type, name) => {
    if (type === 'remote-upstream') return '#475569';
    if (type === 'remote-origin') return '#0284c7';
    if (name === 'main') return '#16a34a';
    return '#9333ea';
  };

  const isOrphan = (commitId) => {
    return !state.branches.some(b => {
      let curr = state.commits.find(c => c.id === b.target);
      while (curr) {
        if (curr.id === commitId) return true;
        curr = state.commits.find(c => c.id === curr.parent);
      }
      return false;
    });
  };

  const currentCommitId = getCurrentCommitId();
  const isDetached = state.head && state.head.type === 'commit';
  const svgHeight = Math.max(600, state.commits.length * 90 + 180);

  // 클릭 가능한 커밋 여부 (클론 후, 현재 위치 제외)
  const isClickableCommit = (commitId) => {
    if (!state.repoState.hasCloned) return false;
    if (state.head?.type === 'commit' && state.head.target === commitId) return false;
    return true;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* 헤더 */}
        <div className="flex justify-between items-end pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Server className="text-indigo-600" size={32} />
              Git 서버 협업 &amp; 로컬 작업 통합 시뮬레이터
            </h1>
            <p className="text-slate-500 mt-2">
              Fork, Clone, Push를 통한 원격 서버 동기화 —
              <span className="text-orange-600 font-medium"> 그래프의 커밋·브랜치를 클릭해 이동하세요</span>
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-medium"
          >
            <RotateCcw size={18} />
            초기화
          </button>
        </div>

        {/* 상태 안내 패널 */}
        <div className={`p-4 rounded-xl border flex items-start gap-4 shadow-sm transition-colors ${
          !state.repoState.hasCloned ? 'bg-blue-50 border-blue-200 text-blue-800' :
          isDetached ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {!state.repoState.hasCloned ? <Cloud className="shrink-0 mt-0.5" size={24} /> :
           isDetached ? <AlertTriangle className="shrink-0 mt-0.5" size={24} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={24} />}
          <div>
            <h3 className="font-bold text-lg">
              현재 환경: {!state.repoState.hasCloned ? '서버 열람 중 (로컬 파일 없음)' : isDetached ? 'Detached HEAD 모드' : '정상 작업 모드 (로컬)'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed">
              {!state.repoState.hasCloned
                ? '오른쪽 패널에서 Fork → Clone을 순서대로 진행하세요.'
                : isDetached
                ? `HEAD가 '${state.head.target}' 커밋에 직접 부착됨. 새 브랜치를 만들어 채택하거나, 로컬 브랜치 이름표를 클릭해 복귀하세요.`
                : `HEAD → 로컬 '${state.head.target}' 브랜치. 커밋 노드를 클릭하면 과거로, 브랜치 이름표를 클릭하면 해당 브랜치로 이동합니다.`}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[750px]">

          {/* 왼쪽: 그래프 패널 */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2 text-slate-700">
                <GitCommit size={18} /> 통합 Git Network Graph
              </span>
              <div className="flex gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-600"></div> Upstream</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-sky-600"></div> Origin (내 클라우드)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-600"></div> Local</span>
              </div>
            </div>
            <div className="flex-1 relative overflow-auto p-4 bg-slate-50/50">
              {/* 클릭 힌트 */}
              {state.repoState.hasCloned && (
                <div className="absolute top-3 right-4 text-[11px] text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 z-10 shadow-sm">
                  💡 커밋 노드 클릭 → Detached 이동 &nbsp;|&nbsp; 브랜치 이름표 클릭 → Switch
                </div>
              )}
              <svg width="100%" height={svgHeight} style={{ minWidth: Math.max(700, LANE_X0 * 2 + state.laneCounter * LANE_W + 200) }}>

                {/* 연결선 */}
                {state.commits.map(commit => {
                  if (!commit.parent) return null;
                  const parent = state.commits.find(c => c.id === commit.parent);
                  return (
                    <path
                      key={`path-${commit.id}`}
                      d={drawPath(parent, commit)}
                      fill="none"
                      stroke={commit.lane === 0 ? '#cbd5e1' : '#e2e8f0'}
                      strokeWidth="4"
                      className="transition-all duration-500"
                    />
                  );
                })}

                {/* 커밋 노드 */}
                {state.commits.map(commit => {
                  const cx = laneX(commit.lane);
                  const cy = commit.y;
                  const isActive = commit.id === currentCommitId;
                  const orphan = isOrphan(commit.id);
                  const clickable = isClickableCommit(commit.id);
                  const hovered = hoveredCommit === commit.id;

                  let fillColor;
                  if (isActive) {
                    fillColor = isDetached ? '#fb923c' : '#34d399';
                  } else if (orphan) {
                    fillColor = '#fca5a5';
                  } else if (hovered && clickable) {
                    fillColor = '#fde68a'; // 호버 시 노란색
                  } else {
                    fillColor = '#f1f5f9';
                  }

                  return (
                    <g
                      key={`node-${commit.id}`}
                      className="transition-all duration-300"
                      style={{ cursor: clickable ? 'pointer' : 'default' }}
                      onClick={() => clickable && handleSwitchDetach(commit.id)}
                      onMouseEnter={() => clickable && setHoveredCommit(commit.id)}
                      onMouseLeave={() => setHoveredCommit(null)}
                    >
                      {/* 클릭 영역 확장용 투명 원 */}
                      <circle cx={cx} cy={cy} r="22" fill="transparent" />

                      <circle
                        cx={cx} cy={cy} r={hovered && clickable ? 16 : 14}
                        fill={fillColor}
                        stroke={isActive ? (isDetached ? '#ea580c' : '#16a34a') : (hovered && clickable ? '#f59e0b' : '#94a3b8')}
                        strokeWidth={isActive ? 3 : hovered && clickable ? 2.5 : 2}
                      />
                      <text x={cx + 25} y={cy - 4} className="text-sm font-bold fill-slate-700" style={{ fontSize: 13, fontWeight: 700 }}>{commit.id}</text>
                      <text x={cx + 25} y={cy + 14} style={{ fontSize: 11, fill: '#64748b' }}>{commit.message}</text>

                      {/* 호버 툴팁 */}
                      {hovered && clickable && (
                        <g>
                          <rect x={cx - 60} y={cy - 40} width="120" height="22" rx="4" fill="#1e293b" opacity="0.9" />
                          <text x={cx} y={cy - 25} textAnchor="middle" style={{ fontSize: 10, fill: 'white' }}>
                            클릭 → {commit.id}로 이동
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 브랜치 이름표 */}
                {state.commits.map(commit => {
                  const branchesHere = state.branches.filter(b => b.target === commit.id);
                  if (branchesHere.length === 0) return null;

                  const cx = laneX(commit.lane);
                  const cy = commit.y;

                  return (
                    <g key={`tags-${commit.id}`} className="transition-all duration-500">
                      {branchesHere.map((branch, idx) => {
                        const bx = cx + 28;
                        const by = cy + 26 + idx * 24;
                        const isHeadHere = state.head?.type === 'branch' && state.head.target === branch.name;
                        const color = getBranchColor(branch.type, branch.name);
                        const isLocalBranch = branch.type === 'local';
                        const isCurrentBranch = isHeadHere;
                        const hovered = hoveredBranch === branch.name;

                        return (
                          <g
                            key={`branch-${branch.name}`}
                            style={{ cursor: isLocalBranch && !isCurrentBranch ? 'pointer' : 'default' }}
                            onClick={() => isLocalBranch && !isCurrentBranch && handleSwitchBranch(branch.name)}
                            onMouseEnter={() => isLocalBranch && !isCurrentBranch && setHoveredBranch(branch.name)}
                            onMouseLeave={() => setHoveredBranch(null)}
                          >
                            <rect
                              x={bx} y={by} width="108" height="20" rx="3"
                              fill={color}
                              opacity={hovered ? 0.75 : 1}
                              stroke={hovered ? '#fbbf24' : 'transparent'}
                              strokeWidth="2"
                            />
                            <text x={bx + 54} y={by + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white', letterSpacing: '0.05em' }}>
                              {branch.name}
                            </text>

                            {isHeadHere && (
                              <g>
                                <rect x={bx + 113} y={by} width="40" height="20" rx="3" fill="#ef4444" />
                                <text x={bx + 133} y={by + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white' }}>HEAD</text>
                              </g>
                            )}

                            {/* 브랜치 호버 툴팁 */}
                            {hovered && (
                              <g>
                                <rect x={bx} y={by - 24} width="120" height="20" rx="3" fill="#1e293b" opacity="0.9" />
                                <text x={bx + 60} y={by - 10} textAnchor="middle" style={{ fontSize: 10, fill: 'white' }}>
                                  클릭 → {branch.name} switch
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Detached HEAD 표시 */}
                {isDetached && (() => {
                  const targetCommit = state.commits.find(c => c.id === currentCommitId);
                  if (!targetCommit) return null;
                  const cx = laneX(targetCommit.lane);
                  const branchesHere = state.branches.filter(b => b.target === currentCommitId);
                  const bx = cx + 28;
                  const by = targetCommit.y + 26 + branchesHere.length * 24;

                  return (
                    <g>
                      <rect x={bx} y={by} width="60" height="20" rx="3" fill="#f97316" />
                      <text x={bx + 30} y={by + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: 'white' }}>HEAD</text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* 오른쪽: 조작 패널 */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

              {/* 서버 연동 섹션 */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 pb-2">
                  <Cloud size={18} className="text-sky-600" /> 1. 서버 연동 (Network)
                </h2>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={handleFork}
                    disabled={state.repoState.hasForked}
                    className="flex items-center justify-center gap-1 bg-sky-100 hover:bg-sky-200 text-sky-800 text-sm py-2 px-2 rounded-lg disabled:opacity-50 transition font-medium"
                  >
                    <GitFork size={14} /> Fork
                  </button>
                  <button
                    onClick={handleClone}
                    disabled={!state.repoState.hasForked || state.repoState.hasCloned}
                    className="flex items-center justify-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-sm py-2 px-2 rounded-lg disabled:opacity-50 transition font-medium"
                  >
                    <Download size={14} /> Clone
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={!state.repoState.hasCloned || isDetached}
                    className="col-span-2 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white text-sm py-2 px-2 rounded-lg disabled:opacity-50 transition font-medium mt-1"
                  >
                    <Upload size={14} /> 서버(origin)로 Push
                  </button>
                </div>
              </div>

              {/* 로컬 작업 섹션 */}
              <div className="p-4 space-y-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b">
                  <Play size={18} className="text-emerald-600" /> 2. 로컬 작업 (Local)
                </h2>

                {/* 로컬 브랜치 빠른 이동 */}
                {state.repoState.hasCloned && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">로컬 브랜치 목록 (클릭 → Switch)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {state.branches
                        .filter(b => b.type === 'local')
                        .map(b => {
                          const isActive = state.head?.type === 'branch' && state.head.target === b.name;
                          return (
                            <button
                              key={b.name}
                              onClick={() => handleSwitchBranch(b.name)}
                              disabled={isActive}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium transition border ${
                                isActive
                                  ? 'bg-emerald-600 text-white border-emerald-700 cursor-default'
                                  : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                              }`}
                            >
                              {isActive ? '✓ ' : ''}{b.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">작업 저장</p>
                  <button
                    onClick={handleCommit}
                    disabled={!state.repoState.hasCloned}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
                  >
                    로컬 커밋 (Save)
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">새 브랜치로 분기</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={e => setNewBranchName(e.target.value)}
                      disabled={!state.repoState.hasCloned}
                      className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-50"
                    />
                    <button
                      onClick={handleCreateBranch}
                      disabled={!state.repoState.hasCloned || (!isDetached && state.head?.target === newBranchName)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg shadow-sm transition disabled:opacity-50 whitespace-nowrap"
                    >
                      브랜치 생성
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 터미널 로그 */}
            <div className="flex-1 bg-slate-900 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col font-mono" style={{ minHeight: 0 }}>
              <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700 text-slate-400 text-xs shrink-0">
                <Terminal size={14} /> Terminal Log
                <span className="ml-auto text-slate-600 text-[10px]">↑↓ 스크롤로 탐색</span>
              </div>
              <div
                ref={logsContainerRef}
                onScroll={handleTerminalScroll}
                className="flex-1 p-4 overflow-y-scroll space-y-1.5 text-[11px] leading-relaxed"
                style={{ minHeight: 0 }}
              >
                {state.logs.map((log, index) => (
                  <div
                    key={index}
                    className={
                      log.startsWith('$') ? 'text-green-400 font-bold mt-3' :
                      log.startsWith('[경고]') ? 'text-amber-400' :
                      log.startsWith('[성공]') ? 'text-emerald-400' :
                      log.startsWith('[안내]') ? 'text-blue-300' :
                      log.startsWith('[오류]') ? 'text-red-400' :
                      'text-slate-400'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
