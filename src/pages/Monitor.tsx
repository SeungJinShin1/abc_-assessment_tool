import { useState } from 'react';
import { ActionBtn } from '../components/ActionBtn';
import { Navbar } from '../components/Navbar';
import { useActions, useLogs, useStudent } from '../hooks/useDb';
import { db, type ActionPreset } from '../lib/db';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, X, MessageSquare } from 'lucide-react';

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

    // 메모 모달 상태
    const [pendingAction, setPendingAction] = useState<ActionPreset | null>(null);
    const [memoText, setMemoText] = useState('');

    const colorOptions = [
        'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-600', 'bg-rose-600',
        'bg-teal-500', 'bg-cyan-500',
    ];

    const handleActionClick = (action: ActionPreset) => {
        if (editMode) return;
        setPendingAction(action);
        setMemoText('');
    };

    const handleSaveLog = async (skipMemo: boolean) => {
        if (!pendingAction) return;
        try {
            await db.logs.add({
                studentId: sid,
                actionId: pendingAction.id,
                actionName: pendingAction.name,
                timestamp: new Date(),
                context: skipMemo ? '' : memoText.trim(),
            });
            setShowToast(`✔ ${pendingAction.name} 기록됨`);
            setTimeout(() => setShowToast(null), 2000);
        } catch (error) {
            console.error("[기능적행동 평가도구] 행동 기록 실패:", error);
        }
        setPendingAction(null);
        setMemoText('');
    };

    const handleDeleteAction = async (id: number, name: string) => {
        if (confirm(`"${name}" 행동 버튼을 삭제하시겠습니까?`)) {
            await db.actions.delete(id);
        }
    };

    const handleAddAction = async () => {
        if (!newActionName.trim()) return;
        await db.actions.add({
            name: newActionName.trim(),
            color: newActionColor,
            type: 'behavior',
        });
        setNewActionName('');
        setNewActionColor('bg-blue-500');
        setShowAddForm(false);
    };

    const handleDeleteLog = async (id: number) => {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
            await db.logs.delete(id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* 공통 내비게이션 */}
            <Navbar studentId={sid} editMode={editMode} onToggleEdit={() => setEditMode(!editMode)} />

            {editMode && (
                <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 text-center text-sm text-orange-700 font-medium">
                    ✏️ 편집 모드 — 행동 버튼을 삭제하거나 새로 추가할 수 있습니다
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {actions?.map((action: ActionPreset) => (
                        <div key={action.id} className="relative">
                            <ActionBtn
                                action={action}
                                onClick={() => handleActionClick(action)}
                            />
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

                    {/* 행동 추가 버튼 */}
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="relative overflow-hidden rounded-3xl p-6 transition-all duration-200 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 aspect-square group"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Plus size={24} className="text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <span className="text-slate-400 font-medium group-hover:text-blue-500">행동 추가</span>
                    </button>
                </div>

                {/* 메모 입력 모달 (핵심: 행동 클릭 → 메모 작성 → 저장) */}
                {pendingAction && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                            <button onClick={() => setPendingAction(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <MessageSquare size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{pendingAction.name}</h3>
                                    <p className="text-xs text-slate-400">{new Date().toLocaleString('ko-KR')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                        📝 선행사건(A) / 맥락 / 교사 메모
                                    </label>
                                    <textarea
                                        value={memoText}
                                        onChange={e => setMemoText(e.target.value)}
                                        placeholder="예: 수학 시간 시작 5분 후, 옆 친구가 크게 소리를 질러 촉발됨. 이어폰을 제공하자 3분 후 안정됨."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
                                        autoFocus
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        💡 이 메모는 AI 리포트 생성 시 가장 중요한 참고 자료가 됩니다.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleSaveLog(true)}
                                        className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        메모 없이 기록
                                    </button>
                                    <button
                                        onClick={() => handleSaveLog(false)}
                                        className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all"
                                    >
                                        메모와 함께 저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 행동 추가 모달 */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                            <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">새 행동 추가</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">행동 이름 *</label>
                                    <input
                                        type="text"
                                        value={newActionName}
                                        onChange={e => setNewActionName(e.target.value)}
                                        placeholder="예: 물건 던지기"
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
                            <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-2 h-full min-h-[2rem] rounded-full bg-blue-500 mt-1"></div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <p className="font-semibold text-slate-800">{log.actionName}</p>
                                                <p className="text-xs text-slate-400">{log.timestamp.toLocaleString('ko-KR')}</p>
                                            </div>
                                            {log.context && (
                                                <div className="mt-1.5 flex items-start gap-1.5">
                                                    <MessageSquare size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm text-slate-500 leading-relaxed">{log.context}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteLog(log.id!)} className="text-slate-400 hover:text-red-500 p-2 flex-shrink-0">
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

            {/* 토스트 알림 */}
            {showToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-sm z-50">
                    {showToast}
                </div>
            )}
        </div>
    );
}
