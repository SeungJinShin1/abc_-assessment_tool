import { FrequencyChart } from '../components/charts/FrequencyChart';
import { SensoryRadar } from '../components/charts/SensoryRadar';
import { Navbar } from '../components/Navbar';
import { useLogs, useStudent } from '../hooks/useDb';
import { Link, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';

export default function Consultation() {
    const { studentId } = useParams();
    const sid = Number(studentId);
    const logs = useLogs(sid);
    const student = useStudent(sid);

    if (!student || !logs) {
        return <div className="p-6 text-slate-500">불러오는 중...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* 공통 내비게이션 */}
            <Navbar studentId={sid} />

            {/* 콘텐츠 */}
            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* 학생 정보 카드 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
                                {student.grade && <p className="text-slate-500 text-sm mt-1">{student.grade}</p>}
                                <p className="text-slate-400 text-xs mt-0.5">총 {logs.length}건의 행동 기록</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                    관찰 진행 중
                                </span>
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    <Printer size={14} /> 인쇄
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 차트 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50">
                                <h3 className="font-semibold text-slate-700">행동 빈도</h3>
                            </div>
                            <div className="p-4">
                                <FrequencyChart logs={logs} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50">
                                <h3 className="font-semibold text-slate-700">감각 프로파일</h3>
                            </div>
                            <div className="p-4">
                                <SensoryRadar profile={student.sensoryProfile} />
                            </div>
                        </div>
                    </div>

                    {/* AI 리포트 바로가기 */}
                    <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold">AI 분석 리포트 생성</h3>
                                <p className="text-white/80 text-sm mt-1 max-w-md">
                                    교사 메모, 감각 프로파일, 행동 빈도를 종합 분석하여 리포트를 생성합니다.
                                </p>
                            </div>
                            <Link to={`/reports/${sid}`} className="px-5 py-2.5 bg-white text-violet-600 font-bold rounded-xl shadow-sm hover:bg-violet-50 transition-colors whitespace-nowrap">
                                리포트 생성
                            </Link>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
