import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useLogs, useStudent, useSavedReports } from '../hooks/useDb';
import { generateReport } from '../lib/gemini';
import { db } from '../lib/db';
import { useParams } from 'react-router-dom';
import { Loader2, Copy, Check, FileText, ClipboardList, GraduationCap } from 'lucide-react';
import type { ActionLog, StudentProfile } from '../lib/db';

type ReportType = 'parent' | 'neis' | 'semester';

interface TabConfig {
    id: ReportType;
    label: string;
    icon: React.ReactNode;
    description: string;
    color: string;
}

const tabs: TabConfig[] = [
    {
        id: 'parent',
        label: '학부모 상담용',
        icon: <FileText size={18} />,
        description: '정중하고 공감적인 어조로 학부모 상담에 활용할 수 있는 리포트를 생성합니다.',
        color: 'from-blue-600 to-cyan-500',
    },
    {
        id: 'neis',
        label: 'NEIS 누가기록',
        icon: <ClipboardList size={18} />,
        description: '교육행정정보시스템(NEIS) 행동특성 및 누가기록에 입력할 수 있는 객관적 서술문을 생성합니다.',
        color: 'from-emerald-600 to-teal-500',
    },
    {
        id: 'semester',
        label: '학기말 종합의견',
        icon: <GraduationCap size={18} />,
        description: '전체 데이터를 분석하여 생활기록부용 종합적 의견(총평)을 생성합니다.',
        color: 'from-violet-600 to-purple-500',
    },
];

function buildPrompt(type: ReportType, student: StudentProfile, logs: ActionLog[]): string {
    const sensoryProfile = JSON.stringify(student.sensoryProfile, null, 2);

    // 메모가 있는 기록과 없는 기록을 분리
    const logsWithMemo = logs.filter(l => l.context && l.context.trim());
    const logsWithoutMemo = logs.filter(l => !l.context || !l.context.trim());

    // 교사 메모 섹션 (가장 중요!)
    const teacherMemos = logsWithMemo.length > 0
        ? logsWithMemo.map(l =>
            `- [${l.timestamp.toLocaleString('ko-KR')}] ${l.actionName}\n  교사 메모: "${l.context}"`
        ).join('\n')
        : '(교사 메모 없음)';

    // 메모 없는 기록은 간략히
    const otherLogs = logsWithoutMemo.length > 0
        ? logsWithoutMemo.map(l =>
            `- [${l.timestamp.toLocaleString('ko-KR')}] ${l.actionName}`
        ).join('\n')
        : '';

    // 행동 빈도 요약 통계
    const frequencyMap = logs.reduce((acc, l) => {
        acc[l.actionName] = (acc[l.actionName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const frequencySummary = Object.entries(frequencyMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => `${name}: ${count}회`)
        .join(', ');

    const base = `
===== 학생 기본 정보 =====
학생 이름: ${student.name}
${student.grade ? `학년/반: ${student.grade}` : ''}
${student.memo ? `학생 특이사항: ${student.memo}` : ''}

===== 감각 프로파일 (1~10 척도, 10이 가장 예민) =====
${sensoryProfile}

===== 행동 빈도 통계 (총 ${logs.length}건) =====
${frequencySummary}

===== ⭐ 교사 직접 메모 (가장 중요한 자료!) =====
아래는 교사가 행동 관찰 시 직접 작성한 메모입니다. 
이 메모에는 선행사건(A), 행동 맥락, 교사의 대응, 결과(C) 등이 포함되어 있습니다.
리포트 작성 시 이 교사 메모의 내용을 가장 중심적으로 반영하세요.

${teacherMemos}

===== 기타 행동 기록 (메모 없음) =====
${otherLogs || '(없음)'}
`;

    switch (type) {
        case 'parent':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생 데이터를 분석하여 **학부모 상담용 리포트**를 작성하세요.

${base}

작성 지침:
1. ⭐ 교사 메모의 구체적인 에피소드와 맥락을 최우선으로 반영하세요. 교사가 직접 관찰하고 기록한 내용이므로, 빈도 데이터보다 메모의 질적 내용이 훨씬 중요합니다.
2. 어조: 정중하고, 공감적이며, 성취 중심으로 서술하세요.
3. 교사 메모에 기록된 구체적 상황을 인용하며 서술하세요 (예: "수업 중 친구와의 갈등 상황에서도 교사의 중재에 잘 반응하였습니다.").
4. 감각 프로파일과 행동 간의 상관관계를 분석하되, 교사 메모에서 확인된 실제 패턴을 근거로 제시하세요.
5. 긍정적인 변화나 성장 가능성을 강조하세요.
6. 가정에서 실천 가능한 구체적인 감각 통합 전략을 제안하세요.
7. 출력 언어: 한국어.`;

        case 'neis':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생의 행동 관찰 기록을 **교육행정정보시스템(NEIS) '행동특성 및 누가기록'**에 입력할 수 있는 형식으로 변환하세요.

${base}

작성 지침:
1. ⭐ 교사 메모의 내용을 최우선 참고 자료로 활용하세요. 메모에 적힌 선행사건, 행동 맥락, 대응 결과 등을 행정 용어로 변환하여 서술하세요.
2. 객관적 사실만 건조하게 서술하라.
3. 주관적 판단(착하다, 나쁘다)을 배제하고 관찰된 행동 위주로 작성하라.
4. 문장 끝맺음은 '~함', '~임' 또는 평서문으로 통일하라.
5. 날짜별로 기록을 그룹화하여 작성하라.
6. 교사 메모의 구체적 에피소드를 행정 문체로 재구성하라.
7. 예시 형식: "4교시 수학 시간 중 외부 소음으로 인한 감각 과부하로 소리를 지르는 등 불안 행동을 보였으나, 이내 안정을 찾고 착석함."
8. 출력 언어: 한국어.`;

        case 'semester':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생의 전체 행동 관찰 데이터를 분석하여 **생활기록부용 학기말 '종합적 의견'**을 작성하세요.

${base}

작성 지침:
1. ⭐ 교사 메모를 통해 파악할 수 있는 학생의 실제 맥락적 행동 패턴을 가장 중요하게 반영하세요.
2. 성장 중심으로 서술하세요: 초기 대비 말기의 행동 빈도 변화를 언급하되, 교사 메모에서 확인되는 구체적 변화 사례를 근거로 제시하세요.
3. 학생의 주된 감각 특성과 강화물(좋아하는 것)을 정의하세요.
4. 교사 메모에서 확인된 효과적인 중재 전략을 향후 지도 계획에 반영하세요.
5. 전문적이고 객관적이면서도 발달 가능성에 초점을 맞춰 서술하세요.
6. 200~400자 내외로 작성하세요.
7. 출력 언어: 한국어.`;
    }
}

export default function Reports() {
    const { studentId } = useParams();
    const sid = Number(studentId);
    const logs = useLogs(sid);
    const student = useStudent(sid);
    const savedReports = useSavedReports(sid);
    const [activeTab, setActiveTab] = useState<ReportType>('parent');
    const [reports, setReports] = useState<Record<ReportType, string>>({ parent: '', neis: '', semester: '' });
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // DB에서 저장된 리포트 로드
    useEffect(() => {
        if (savedReports) {
            const loaded: Record<ReportType, string> = { parent: '', neis: '', semester: '' };
            for (const r of savedReports) {
                loaded[r.reportType as ReportType] = r.content;
            }
            setReports(loaded);
        }
    }, [savedReports]);

    const report = reports[activeTab];

    // 메모가 있는 기록 수 계산
    const memoCount = logs?.filter((l: ActionLog) => l.context && l.context.trim()).length || 0;

    const handleGenerate = async () => {
        if (!logs || !student) return;

        setLoading(true);
        try {
            const prompt = buildPrompt(activeTab, student, logs);
            const result = await generateReport(prompt);
            setReports(prev => ({ ...prev, [activeTab]: result }));

            // DB에 저장 (기존 같은 타입 리포트 삭제 후 새로 저장)
            const existing = await db.reports
                .where('studentId').equals(sid)
                .filter(r => r.reportType === activeTab)
                .toArray();
            for (const e of existing) {
                if (e.id) await db.reports.delete(e.id);
            }
            await db.reports.add({
                studentId: sid,
                reportType: activeTab,
                content: result,
                generatedAt: new Date(),
            });
        } catch {
            alert("리포트 생성에 실패했습니다. API 키를 확인해 주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(report);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentTab = tabs.find(t => t.id === activeTab)!;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* 공통 내비게이션 */}
            <Navbar studentId={sid} />

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
                {/* 탭 선택 */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex border-b border-slate-100">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        <p className="text-sm text-slate-500 mb-4">{currentTab.description}</p>
                        <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                            <span>📊 행동 기록: {logs?.length || 0}건</span>
                            <span>📝 메모 포함: {memoCount}건</span>
                            <span>👤 학생: {student?.name || '...'}</span>
                        </div>

                        {memoCount === 0 && (logs?.length || 0) > 0 && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                                💡 교사 메모가 없습니다. 행동 기록 시 메모를 함께 작성하면 훨씬 풍부하고 정확한 리포트를 생성할 수 있습니다.
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !logs?.length}
                            className={`w-full py-3 bg-gradient-to-r ${currentTab.color} text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : currentTab.icon}
                            {loading ? "분석 중..." : report ? `${currentTab.label} 다시 생성하기` : `${currentTab.label} 생성하기`}
                        </button>
                    </div>
                </div>

                {/* 결과 */}
                {report && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
                            <h3 className="font-bold text-slate-700">생성 결과 — {currentTab.label}</h3>
                            <button onClick={handleCopy} className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium">
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                {copied ? "복사 완료" : "텍스트 복사"}
                            </button>
                        </div>
                        <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-600 leading-relaxed text-sm">
                            {report}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
