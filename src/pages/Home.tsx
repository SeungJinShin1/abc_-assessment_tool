import { useState } from 'react';
import { useStudents } from '../hooks/useDb';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, User, X } from 'lucide-react';

export default function Home() {
    const students = useStudents();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [memo, setMemo] = useState('');
    const [sensory, setSensory] = useState({
        visual: 5, auditory: 5, tactile: 5, vestibular: 5, proprioceptive: 5,
    });

    const handleAddStudent = async () => {
        if (!name.trim()) return;
        await db.students.add({
            name: name.trim(),
            grade: grade.trim(),
            memo: memo.trim(),
            sensoryProfile: sensory,
        });
        setName('');
        setGrade('');
        setMemo('');
        setSensory({ visual: 5, auditory: 5, tactile: 5, vestibular: 5, proprioceptive: 5 });
        setShowForm(false);
    };

    const handleDeleteStudent = async (id: number, studentName: string) => {
        if (confirm(`"${studentName}" 학생 정보를 삭제하시겠습니까?\n관련된 모든 행동 기록도 함께 삭제됩니다.`)) {
            await db.logs.where('studentId').equals(id).delete();
            await db.students.delete(id);
        }
    };

    const sensoryLabels: Record<string, string> = {
        visual: '시각', auditory: '청각', tactile: '촉각',
        vestibular: '전정감각', proprioceptive: '고유수용감각',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
            {/* 헤더 */}
            <header className="bg-white/80 backdrop-blur-md px-6 py-5 shadow-sm sticky top-0 z-10 border-b border-slate-100">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                            <span className="text-white text-lg font-black">F</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">기능적행동 평가도구</h1>
                            <p className="text-xs text-slate-400">Functional Behavior Assessment Tool</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-700">학생 관리</h2>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            학생 추가
                        </button>
                    </div>

                    {/* 학생 추가 폼 (모달) */}
                    {showForm && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95">
                                <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">새 학생 등록</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">이름 *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="예: 학생 이름"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">학년/반</label>
                                        <input
                                            type="text"
                                            value={grade}
                                            onChange={e => setGrade(e.target.value)}
                                            placeholder="예: 3학년 2반"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">메모</label>
                                        <textarea
                                            value={memo}
                                            onChange={e => setMemo(e.target.value)}
                                            placeholder="특이사항이나 참고 메모"
                                            rows={2}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm resize-none"
                                        />
                                    </div>

                                    {/* 감각 프로파일 슬라이더 */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-2">감각 프로파일 (1=둔함, 10=예민)</label>
                                        <div className="space-y-2">
                                            {(Object.keys(sensory) as Array<keyof typeof sensory>).map(key => (
                                                <div key={key} className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500 w-20 text-right">{sensoryLabels[key]}</span>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        value={sensory[key]}
                                                        onChange={e => setSensory(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                        className="flex-1 accent-blue-600"
                                                    />
                                                    <span className="text-xs font-semibold text-blue-600 w-6 text-center">{sensory[key]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddStudent}
                                        disabled={!name.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        등록하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 학생 카드 그리드 */}
                    {(!students || students.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <User size={64} strokeWidth={1} className="mb-4 text-slate-300" />
                            <p className="text-lg font-medium">등록된 학생이 없습니다</p>
                            <p className="text-sm mt-1">위의 "학생 추가" 버튼을 눌러 학생을 등록해 주세요.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer overflow-hidden"
                                    onClick={() => navigate(`/monitor/${student.id}`)}
                                >
                                    {/* 삭제 버튼 */}
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteStudent(student.id, student.name); }}
                                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                        title="학생 삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    {/* 상단 컬러 바 */}
                                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                                    <div className="p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                                <User size={24} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 text-lg truncate">{student.name}</h3>
                                                {student.grade && (
                                                    <p className="text-sm text-slate-500">{student.grade}</p>
                                                )}
                                            </div>
                                        </div>

                                        {student.memo && (
                                            <p className="mt-3 text-xs text-slate-400 line-clamp-2">{student.memo}</p>
                                        )}

                                        {/* 감각 미니 바 */}
                                        <div className="mt-4 grid grid-cols-5 gap-1">
                                            {Object.entries(student.sensoryProfile).map(([key, val]) => (
                                                <div key={key} className="flex flex-col items-center gap-0.5">
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                                                            style={{ width: `${(val as number) * 10}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{sensoryLabels[key]}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 text-xs text-blue-500 font-medium group-hover:text-blue-600 transition-colors">
                                            행동 기록하기 →
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
