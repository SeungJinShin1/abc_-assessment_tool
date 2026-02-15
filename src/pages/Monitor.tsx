import { useState } from 'react';
import { ActionBtn } from '../components/ActionBtn';
import { Navbar } from '../components/Navbar';
import { useActions, useLogs, useStudent } from '../hooks/useDb';
import { db, type ActionPreset, type ActionLog } from '../lib/db';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, X, MessageSquare, Calendar, Shield } from 'lucide-react';

export default function Monitor() {
    const { studentId } = useParams();
    const sid = Number(studentId);
    const actions = useActions();
    const recentLogs = useLogs(sid);
    const student = useStudent(sid);
    const [showToast, setShowToast] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newActionName, setNewActionName] = useState('');
    const [newActionColor, setNewActionColor] = useState('bg-blue-500');
    const [newActionType, setNewActionType] = useState<'behavior' | 'intervention'>('behavior');

    // 메모 모달 상태
    const [pendingAction, setPendingAction] = useState<ActionPreset | null>(null);
    const [memoText, setMemoText] = useState('');
    const [interventionText, setInterventionText] = useState('');
    const [logDate, setLogDate] = useState('');

    const colorOptions = [
        'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-600', 'bg-rose-600',
        'bg-teal-500', 'bg-cyan-500',
    ];

    const [editingLogId, setEditingLogId] = useState<number | null>(null);

    // 행동 프리셋과 중재 프리셋 분리
    const behaviorActions = actions?.filter((a: ActionPreset) => a.type !== 'intervention') || [];
    const interventionActions = actions?.filter((a: ActionPreset) => a.type === 'intervention') || [];

    // datetime-local 포맷 헬퍼
    const toLocalDatetime = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    const handleActionClick = (action: ActionPreset) => {
        if (editMode) return;
        setPendingAction(action);
        setMemoText('');
        setInterventionText('');
        setLogDate(toLocalDatetime(new Date()));
        setEditingLogId(null); // 새 기록 모드
    };

    const handleLogClick = (log: ActionLog) => {
        if (editMode) return;

        // 원본 액션 찾기 (색상/타입 유지를 위해) 또는 폴백 생성
        const originalAction = actions?.find((a: ActionPreset) => a.id === log.actionId);
        const preset: ActionPreset = originalAction || {
            id: log.actionId,
            name: log.actionName,
            color: 'bg-slate-400',
            type: 'behavior'
        };

        setPendingAction(preset);
        setMemoText(log.context || '');
        setInterventionText(log.intervention || '');
        setLogDate(toLocalDatetime(log.timestamp));
        setEditingLogId(log.id); // 수정 모드 진입
    };

    const handleSaveLog = async (skipMemo: boolean) => {
        if (!pendingAction) return;

        const logData = {
            studentId: sid,
            actionId: pendingAction.id,
            actionName: pendingAction.name,
            timestamp: logDate ? new Date(logDate) : new Date(),
            context: skipMemo ? '' : memoText.trim(),
            intervention: skipMemo ? '' : interventionText.trim(),
        };

        try {
            if (editingLogId) {
                // 수정
                await db.logs.update(editingLogId, {
                    timestamp: logData.timestamp,
                    context: logData.context,
                    intervention: logData.intervention
                });
                setShowToast(`✔수정됨`);
            } else {
                // 신규
                await db.logs.add(logData);
                setShowToast(`✔ ${pendingAction.name} 기록됨`);
            }
            setTimeout(() => setShowToast(null), 2000);
        } catch (error) {
            console.error("[기능적행동 평가도구] 행동 기록 실패:", error);
        }
        setPendingAction(null);
        setMemoText('');
        setInterventionText('');
        setEditingLogId(null);
    };

    const handleDeleteAction = async (id: number, name: string) => {
        if (confirm(`"${name}" 버튼을 삭제하시겠습니까?`)) {
            await db.actions.delete(id);
        }
    };

    const handleAddAction = async () => {
        if (!newActionName.trim()) return;
        await db.actions.add({
            name: newActionName.trim(),
            color: newActionColor,
            type: newActionType,
        });
        setNewActionName('');
        setNewActionColor('bg-blue-500');
        setNewActionType('behavior');
        setShowAddForm(false);
    };

    const handleDeleteLog = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // 부모 클릭 방지 (수정 모달 열림 방지)
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            await db.logs.delete(id);
        }
    };

    // 중재 프리셋 클릭 → interventionText에 삽입
    const handleInterventionPresetClick = (name: string) => {
        setInterventionText(prev => prev ? `${prev}, ${name}` : name);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar studentId={sid} editMode={editMode} onToggleEdit={() => setEditMode(!editMode)} />

            {editMode && (
                <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 text-center text-sm text-orange-700 font-medium">
                    ✏️ 편집 모드 — 행동/중재 버튼을 삭제하거나 새로 추가할 수 있습니다
                </div>
            )}

            {/* 학생 정보 */}
            {student && (
                <div className="bg-white border-b border-slate-100 px-6 py-3">
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{student.name[0]}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800">{student.name}</span>
                            {student.grade && <span className="ml-2 text-sm text-slate-400">{student.grade}</span>}
                        </div>
                        <span className="ml-auto text-xs text-slate-400">기록 {recentLogs?.length || 0}건</span>
                    </div>
                </div>
            )}

            {/* 행동 버튼 그리드 */}
            <main className="flex-1 p-6 overflow-y-auto">
                {/* 문제행동 섹션 */}
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">🔴 행동 관찰</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {behaviorActions.map((action: ActionPreset) => (
                            <div key={action.id} className="relative">
                                <ActionBtn action={action} onClick={() => handleActionClick(action)} />
                                {editMode && (
                                    <button
                                        onClick={() => handleDeleteAction(action.id, action.name)}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 중재 프리셋 섹션 (v1.3) */}
                {interventionActions.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-6">
                        <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">🟢 지도 · 중재</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {interventionActions.map((action: ActionPreset) => (
                                <div key={action.id} className="relative">
                                    <ActionBtn action={action} onClick={() => handleActionClick(action)} />
                                    {editMode && (
                                        <button
                                            onClick={() => handleDeleteAction(action.id, action.name)}
                                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 추가 버튼 */}
                <div className="max-w-4xl mx-auto mt-4">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full rounded-2xl p-4 transition-all duration-200 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center gap-2 group"
                    >
                        <Plus size={20} className="text-slate-400 group-hover:text-blue-500" />
                        <span className="text-slate-400 font-medium group-hover:text-blue-500">행동 / 중재 추가</span>
                    </button>
                </div>

                {/* ===== 메모 입력 모달 (v1.3 강화 + 수정 모드) ===== */}
                {pendingAction && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setPendingAction(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingAction.type === 'intervention' ? 'bg-emerald-100' : 'bg-blue-100'
                                    }`}>
                                    {pendingAction.type === 'intervention'
                                        ? <Shield size={20} className="text-emerald-600" />
                                        : <MessageSquare size={20} className="text-blue-600" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {pendingAction.name}
                                        {editingLogId && <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">수정 중</span>}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {pendingAction.type === 'intervention' ? '지도·중재' : '행동 관찰'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* 날짜/시간 수동 입력 (v1.3 핵심) */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
                                        <Calendar size={14} /> 날짜 · 시간
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={logDate}
                                        onChange={e => setLogDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        ⏰ 기본값은 현재 시각. 수업 중 못 적었다면 시간을 소급하여 수정하세요.
                                    </p>
                                </div>

                                {/* 선행사건 / 맥락 메모 */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                        📝 선행사건(A) / 맥락
                                    </label>
                                    <textarea
                                        value={memoText}
                                        onChange={e => setMemoText(e.target.value)}
                                        placeholder="예: 수학 시간 시작 5분 후, 옆 친구가 크게 소리를 질러 촉발됨."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
                                        autoFocus
                                    />
                                </div>

                                {/* 지도·중재 입력 (v1.3 핵심) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                        🏫 지도 및 중재 (교사의 대응)
                                    </label>
                                    <textarea
                                        value={interventionText}
                                        onChange={e => setInterventionText(e.target.value)}
                                        placeholder="예: 감정 카드 제시 후 스스로 진정하도록 기다려줌. 3분 후 안정."
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm resize-none bg-emerald-50/50"
                                    />
                                    {/* 중재 프리셋 원터치 버튼 */}
                                    {interventionActions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {interventionActions.map((ia: ActionPreset) => (
                                                <button
                                                    key={ia.id}
                                                    type="button"
                                                    onClick={() => handleInterventionPresetClick(ia.name)}
                                                    className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                                                >
                                                    + {ia.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        💡 이 메모와 중재 기록이 AI 리포트의 핵심 자료가 됩니다.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={() => handleSaveLog(true)}
                                        className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        메모 없이 {editingLogId ? '수정' : '기록'}
                                    </button>
                                    <button
                                        onClick={() => handleSaveLog(false)}
                                        className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all"
                                    >
                                        {editingLogId ? '수정 완료' : '저장하기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 행동/중재 추가 모달 */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                            <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">새 버튼 추가</h3>
                            <div className="space-y-4">
                                {/* 유형 선택 */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">유형</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setNewActionType('behavior')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-all ${newActionType === 'behavior'
                                                ? 'border-red-400 bg-red-50 text-red-700'
                                                : 'border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            🔴 행동 관찰
                                        </button>
                                        <button
                                            onClick={() => setNewActionType('intervention')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-xl border-2 transition-all ${newActionType === 'intervention'
                                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                                : 'border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            🟢 지도·중재
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">이름 *</label>
                                    <input
                                        type="text"
                                        value={newActionName}
                                        onChange={e => setNewActionName(e.target.value)}
                                        placeholder={newActionType === 'behavior' ? '예: 물건 던지기' : '예: 감정 카드 제시'}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">색상</label>
                                    <div className="flex flex-wrap gap-2">
                                        {colorOptions.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewActionColor(c)}
                                                className={`w-8 h-8 rounded-full ${c} ${newActionColor === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''} transition-all`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddAction}
                                    disabled={!newActionName.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    추가하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 최근 기록 */}
                <div className="mt-8 max-w-4xl mx-auto">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">최근 기록</h2>
                    <div className="space-y-2">
                        {recentLogs?.slice(0, 15).map((log) => (
                            <div
                                key={log.id}
                                onClick={() => handleLogClick(log)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-2 h-full min-h-[2rem] rounded-full mt-1 ${log.intervention ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <p className="font-semibold text-slate-800 flex items-center gap-2">
                                                    {log.actionName}
                                                    <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        수정하려면 클릭
                                                    </span>
                                                </p>
                                                <p className="text-xs text-slate-400">{log.timestamp.toLocaleString('ko-KR')}</p>
                                            </div>
                                            {log.context && (
                                                <div className="mt-1.5 flex items-start gap-1.5">
                                                    <MessageSquare size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm text-slate-500 leading-relaxed">{log.context}</p>
                                                </div>
                                            )}
                                            {log.intervention && (
                                                <div className="mt-1 flex items-start gap-1.5">
                                                    <Shield size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm text-emerald-600 leading-relaxed">{log.intervention}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteLog(e, log.id!)}
                                        className="text-slate-400 hover:text-red-500 p-2 flex-shrink-0 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!recentLogs || recentLogs.length === 0) && (
                            <p className="text-center text-slate-400 py-8">아직 기록이 없습니다. 위 버튼을 눌러 행동을 기록하세요.</p>
                        )}
                    </div>
                </div>
            </main>

            {showToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-sm z-50">
                    {showToast}
                </div>
            )}
        </div>
    );
}
