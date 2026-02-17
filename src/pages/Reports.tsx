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

    // ===== 개인정보 마스킹 (v1.3): AI에는 이름 대신 'OOO' 전송 =====
    const maskedName = 'OOO';

    // 메모/중재가 있는 기록과 없는 기록 분리
    const logsWithDetails = logs.filter(l =>
        (l.context && l.context.trim()) || (l.intervention && l.intervention.trim())
    );
    const logsWithoutDetails = logs.filter(l =>
        (!l.context || !l.context.trim()) && (!l.intervention || !l.intervention.trim())
    );

    // 교사 메모+중재 섹션 (가장 중요!)
    const teacherMemos = logsWithDetails.length > 0
        ? logsWithDetails.map(l => {
            let entry = `- [${l.timestamp.toLocaleString('ko-KR')}] ${l.actionName}`;
            if (l.context?.trim()) entry += `\n  선행사건/맥락: "${l.context}"`;
            if (l.intervention?.trim()) entry += `\n  교사 중재: "${l.intervention}"`;
            return entry;
        }).join('\n')
        : '(교사 메모 없음)';

    // 메모 없는 기록은 간략히
    const otherLogs = logsWithoutDetails.length > 0
        ? logsWithoutDetails.map(l =>
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

    // 중재 방법 빈도 통계 (v1.3)
    const interventionLogs = logs.filter(l => l.intervention?.trim());
    const interventionSummary = interventionLogs.length > 0
        ? interventionLogs.map(l => l.intervention!.trim()).join(', ')
        : '(기록된 중재 없음)';

    const base = `
===== 학생 기본 정보 =====
학생: ${maskedName}
${student.grade ? `학년/반: ${student.grade}` : ''}
${student.memo ? `학생 특이사항: ${student.memo}` : ''}

===== 감각 프로파일 (1~10 척도, 10이 가장 예민) =====
${sensoryProfile}

===== 행동 빈도 통계 (총 ${logs.length}건) =====
${frequencySummary}

===== ⭐ 교사 직접 관찰 기록 (가장 중요한 자료!) =====
아래는 교사가 행동 관찰 시 직접 작성한 메모와 중재 기록입니다.
[선행사건/맥락]은 행동이 발생한 상황, [교사 중재]는 교사가 어떻게 지도했는지를 나타냅니다.
리포트 작성 시 이 기록을 가장 중심적으로 반영하세요.

${teacherMemos}

===== 교사 중재 방법 요약 =====
${interventionSummary}

===== 기타 행동 기록 (상세 메모 없음) =====
${otherLogs || '(없음)'}
`;

    switch (type) {
        case 'parent':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생 데이터를 분석하여 **학부모 소통용 '원팀(One Team)' 리포트**를 작성하세요.
이 리포트는 가정통신문, 알림장, 카카오톡 등으로 학부모에게 전달되는 용도입니다.

${base}

작성 지침:
1. ⭐ 교사 메모와 중재 기록을 최우선으로 반영하세요. 교사가 어떻게 지도했고, 아이가 어떻게 반응했는지가 핵심입니다.
2. 어조: 따뜻하고 전문적이며 협력적 권유형으로 작성하세요.
3. 반드시 아래 4단 구조로 작성하세요:

[오늘의 성장] — 작은 것이라도 칭찬 거리를 먼저 언급하세요.
[상황 설명] — 문제행동을 건조하게 묘사하되, 그 원인(불편함 등)을 아이 입장에서 해석하세요.
[교사의 조치] — "제가 학교에서 ~방법으로 지도했더니 아이가 편안해했습니다." 형태로, 교사의 전문성과 신뢰를 보여주세요.
[가정 연계 요청] — "댁에서도 ~상황이 오면 학교와 똑같이 ~게 반응해 주세요. 일관된 태도가 아이에게 안정감을 줍니다." 형태로 원팀을 강조하세요.

4. 학생 이름은 "${maskedName}" 그대로 사용하세요 (개인정보 보호).
5. 출력 언어: 한국어.`;

        case 'neis':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생의 행동 관찰 기록을 **교육행정정보시스템(NEIS) '행동특성 및 누가기록'**에 입력할 수 있는 형식으로 변환하세요.

${base}

작성 지침:
1. ⭐ 교사 메모와 중재 기록을 최우선 참고 자료로 활용하세요.
2. 각 기록을 "일시, 장소(맥락), 행동, 교사 조치, 결과" 순서로 문장화하세요.
3. 객관적 사실만 건조하게 서술하라. 주관적 판단(착하다, 나쁘다)을 배제.
4. 문장 끝맺음은 '~함', '~임' 또는 평서문으로 통일.
5. 날짜별로 기록을 그룹화하여 작성.
6. 교사의 중재 방법과 그 결과를 반드시 포함.
7. 예시: "3교시 국어 시간, 과제 수행 중 거부 의사를 표하며 자리를 이탈하였으나, 교사의 언어적 촉구와 시각적 단서 제공을 통해 다시 착석하여 과제를 완수함."
8. 학생 이름은 "${maskedName}" 그대로 사용 (개인정보 보호).
9. 출력 언어: 한국어.`;

        case 'semester':
            return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생의 전체 행동 관찰 데이터를 분석하여 **생활기록부용 학기말 '종합적 의견'**을 작성하세요.

${base}

작성 지침:
1. ⭐ 교사 메모와 중재 기록을 통해 파악할 수 있는 학생의 실제 행동 패턴과 변화를 가장 중요하게 반영하세요.
2. 성장 중심으로 서술: 초기 대비 말기의 행동 빈도 변화를 언급하되, 교사 메모에서 확인되는 구체적 변화 사례를 근거로 제시.
3. 한 학기 동안 축적된 '지도 방법'과 '학생의 반응' 데이터를 분석하여 **가장 효과적인 교육적 접근법**을 제안하세요.
4. 학생의 주된 감각 특성과 강화물(좋아하는 것)을 정의.
5. 전문적이고 객관적이면서도 발달 가능성에 초점을 맞춰 서술.
6. 200~400자 내외로 작성.
7. 학생 이름은 "${maskedName}" 그대로 사용 (개인정보 보호).
8. 출력 언어: 한국어.`;
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
    const memoCount = logs?.filter((l: ActionLog) => (l.context && l.context.trim()) || (l.intervention && l.intervention.trim())).length || 0;

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
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '알 수 없는 오류';
            alert(`리포트 생성에 실패했습니다.\n${msg}`);
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
