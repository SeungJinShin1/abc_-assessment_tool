import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { useLogs, useStudent, useSavedReports } from '../hooks/useDb';
import { generateReport } from '../lib/gemini';
import { db } from '../lib/db';
import { useParams } from 'react-router-dom';
import { Loader2, Copy, Check, FileText, ClipboardList, GraduationCap, Download, MessageSquare, Shield, Sparkles } from 'lucide-react';
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
        description: 'NEIS 행동특성 및 종합적 누가기록을 생성합니다.',
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
9. 출력 언어: 한국어.

========================================
⭐⭐⭐ [교사용 법적 소명 및 방어 자료] ⭐⭐⭐
========================================
위의 1~9번에 따른 NEIS 입력용 텍스트 작성이 끝난 후, 반드시 아래의 법적 소명·방어 자료를 추가 작성하세요.
이 부분은 오직 교사만을 위한 것이며, 감정적 위로나 공감 문구는 절대 포함하지 마십시오.
철저히 객관적·법률적·증거 기반으로만 서술하십시오.

핵심 전제: "문제가 된 학생의 상처·상태 변화가 특수학급 체류 시간 동안 발생하지 않았음"을 입증하는 것이 1차 목표입니다.

아래 7개 항목을 모두 포함하여, 날짜별·시간대별로 상세하게 개조식(텍스트)으로 작성하세요.

--- [1. 날짜·시간대별 특이사항 부재 입증] ---
위 관찰 기록 데이터를 날짜별로 분석하여, 각 날짜의 특수학급 체류 시간 동안:
- 낙상, 충돌, 타격, 자해, 타해 등 상처를 유발할 만한 사건이 없었음을 시간 순서로 서술
- "[날짜] [시간] ~ [시간]: 해당 시간 동안 ~활동을 수행하였으며, 신체 접촉 사고나 돌발행동은 관찰되지 않음"의 형태로 기록
- 기록된 모든 날짜에 대해 빠짐없이 서술할 것

--- [2. 보호·감독 의무 이행 입증] ---
교사가 다음 법률에 따른 보호·감독 의무를 이행했음을 기록 기반으로 서술:
- 아동복지법 제3조(아동의 이익 최우선), 제15조(보호조치)
- 장애인 등에 대한 특수교육법 제22조(개별화교육), 제27조(특수학급 설치·운영)
- 교육기본법 제12조(학습자의 보호)
- 구체적 이행 내용: 학생 입실 시 신체·정서 상태 확인 여부, 활동 중 상시 관찰 여부, 위험 요소 사전 제거 조치, 퇴실 시 상태 재확인 여부 등을 날짜별로 서술

--- [3. 시간대 교차 검증 및 알리바이 확보 방안] ---
교사가 즉시 확보하거나 학교에 요청해야 할 증거 목록을 구체적으로 안내:
- CCTV: 특수학급 내부·복도·교실 출입구, 운동장의 CCTV 영상 보존 요청 (학교 행정실에 서면 요청, 보존 기간 경과 전 반드시 확보). 요청서 문구 예시 포함
- 출결·이동 기록: NEIS 출석부, 특수학급 입·퇴실 기록부(수기 또는 전자), 통합학급 담임의 학생 인도·인수 시간 확인서
- 의료 소견: 학부모가 제출한 진단서상 상처 발생 추정 시점과 특수학급 체류 시간 대조. 의학적으로 상처의 발생 시점이 특수학급 체류 시간과 불일치할 경우 이를 명시
- 동료 교원 진술: 공동 수업 보조인력(특수교육실무사, 사회복무요원 등)의 확인서 또는 진술서 확보 방안

--- [4. 관련 법령 및 교사 권리 고지] ---
교사가 자신을 방어하기 위해 반드시 알아야 할 법률을 정리:
- 교원의 지위 향상 및 교육활동 보호를 위한 특별법(교원지위법) 제15조(교육활동 침해행위에 대한 조치): 교사가 부당한 민원·고소로부터 보호받을 권리
- 아동학대범죄의 처벌 등에 관한 특례법 제10조의2(직무상 아동학대 신고): 신고 의무와 교사의 정당한 교육활동의 구분
- 형법 제156조(무고죄): 허위 사실로 고소할 경우 고소인이 무고죄로 처벌받을 수 있음(10년 이하의 징역 또는 1,500만원 이하의 벌금)
- 교원지위법 제18조의2(교육활동 침해 시 고발 의무): 학교장에게 교육활동 침해 고발 요청 가능
- 국가인권위원회법에 따른 진정 가능성: 교사의 인권 침해 시 구제 방안

--- [5. 사안 발생 후 즉시 대응 체크리스트] ---
날짜가 지났더라도 아직 취할 수 있는 조치를 포함하여 시간순으로 안내:
[즉시(인지 당일)]:
- 자신의 일과 기록을 시간 단위로 회고하여 서면 정리 (본인 진술서 작성)
- CCTV 보존 요청 서면 제출 (영상 자동 삭제 방지)
- 해당 일(들)의 보조인력·통합학급 담임에게 사실 확인 요청
- 학교 관리자(교감·교장)에게 상황 보고 및 교원보호위원회 개최 요청

[1~3일 내]:
- 시·도교육청 교권보호센터(☎ 1396, ☎ 교육청 대표번호) 상담 및 사건 접수
- 한국교원단체총연합회 또는 전국교직원노동조합 법률지원 요청
- 학교 교원보호위원회 또는 교육활동침해심의위원회 심의 요청

[1주 내]:
- 학부모 제출 진단서의 의학적 소견과 특수학급 체류 시간 대조표 작성
- 필요시 교사 측 법률 대리인(변호사) 선임 검토 — 시·도교육청 법률상담 지원 제도 활용 가능
- 관련 일체의 기록(카카오톡 대화, 문자, 알림장 등) 스크린샷 보존

--- [6. 진술서·소명서 작성 가이드] ---
교사가 직접 작성해야 할 소명서의 구조를 아래와 같이 안내:
1) 사건 개요: 학부모 주장 요약 ("~일 상처가 특수학급에서 발생했다는 취지")
2) 사실관계: 날짜·시간별 교사의 행동과 학생 상태를 관찰 기록에 근거하여 서술
3) 증거 목록: 확보한 CCTV, 입퇴실 기록, 동료 진술서, 의료 소견 대조 결과 등
4) 법적 근거: 교원지위법, 아동복지법상 보호·감독 의무 이행 사실, 교육활동의 정당성
5) 결론: 특수학급 체류 중 상처 유발 사건이 없었음을 기록과 증거로 소명하며, 허위 신고에 대한 교사의 법적 권리 유보 (형법 제156조 무고죄)

--- [7. 향후 재발 방지 및 기록 강화 권고] ---
- 매일 특수학급 입실·퇴실 시 학생의 신체 상태(기존 상처·멍 등)를 간략히 기록하는 습관 권장 (입실 체크리스트)
- 학생 신체에서 기존 상처가 확인될 경우, 입실 시점에 사진 촬영 및 통합학급 담임에게 즉시 고지
- 모든 교육활동 기록을 가능한 한 실시간으로 본 앱에 입력하여 시간 데이터의 신뢰성 확보
- 분기 1회 이상 교원보호 관련 연수 이수 기록 보관`;


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

function buildLogPrompt(student: StudentProfile, log: ActionLog): string {
    const sensoryProfile = JSON.stringify(student.sensoryProfile, null, 2);
    const maskedName = 'OOO';

    let entry = `- [${new Date(log.timestamp).toLocaleString('ko-KR')}] ${log.actionName}`;
    if (log.context?.trim()) entry += `\n  선행사건/맥락: "${log.context}"`;
    if (log.intervention?.trim()) entry += `\n  교사 중재: "${log.intervention}"`;

    return `당신은 특수교육 전문가 AI 보조 도구입니다.
아래 학생의 개별 행동 관찰 기록 1건을 분석하여 **교육행정정보시스템(NEIS) '행동특성 및 누가기록'**에 입력할 수 있는 형식으로 변환하고, 이어서 **교사용 법적 소명 및 방어 팁**을 별도로 함께 작성하세요.

===== 학생 기본 정보 =====
학생: ${maskedName}
${student.grade ? `학년/반: ${student.grade}` : ''}
${student.memo ? `학생 특이사항: ${student.memo}` : ''}
감각 프로파일: ${sensoryProfile}

===== ⭐ 개별 관찰 기록 =====
${entry}

작성 지침:
1. 해당 기록 하나에 집중하여 객관적으로 서술하세요.
2. 각 기록을 "일시, 장소(맥락), 행동, 교사 조치, 결과" 순서로 문장화하세요.
3. 객관적 사실만 건조하게 서술하라. 주관적 판단을 배제.
4. 문장 끝맺음은 '~함', '~임' 또는 평서문으로 통일.
5. 학생 이름은 "${maskedName}" 그대로 사용 (개인정보 보호).

========================================
⭐ [교사용 법적 소명 및 방어 자료] ⭐
========================================
NEIS 입력용 텍스트 작성이 끝난 후, 이어서 특수학급 교사 보호를 위한 방어 자료를 객관적 서술로 작성하세요. (감정적 위로 제외)
1. 날짜·시간대별 특이사항 부재 입증: 이 관찰 시간 동안 특별한 낙상이나 신체손상, 타해 등이 관찰되지 않았음을 기록.
2. 보호·감독 의무 이행 입증: 교사의 적절한 중재(타임아웃, 감정카드 제시 등)가 이루어졌음 명시.
3. 향후 재발 방지 및 증거 확보 팁: 해당 행동이 자주 발생할 경우 권장되는 대비책 조언.

출력 언어: 한국어.
`;
}

const exportToExcel = (logs: ActionLog[], student: StudentProfile | undefined) => {
    const header = ['날짜', '행동 이름', '맥락/선행사건', '중재', 'AI 생성 코멘트'];
    const rows = logs.map(l => [
        new Date(l.timestamp).toLocaleString('ko-KR').replace(/,/g, ''),
        l.actionName,
        `"${(l.context || '').replace(/"/g, '""')}"`,
        `"${(l.intervention || '').replace(/"/g, '""')}"`,
        `"${(l.aiComment || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "\\uFEFF" + [header, ...rows].map(e => e.join(",")).join("\\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${student?.name || '학생'}_NEIS_누가기록.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

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

    // NEIS Tab states
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [generatingLogId, setGeneratingLogId] = useState<number | null>(null);

    // months available based on logs
    const availableMonths = useMemo(() => {
        if (!logs) return [new Date().getMonth() + 1];
        const m = new Set<number>();
        logs.forEach(l => m.add(new Date(l.timestamp).getMonth() + 1));
        return Array.from(m).sort((a,b) => a - b);
    }, [logs]);

    useEffect(() => {
        if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
            setSelectedMonth(availableMonths[availableMonths.length - 1]);
        }
    }, [availableMonths, selectedMonth]);

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        return logs.filter(l => new Date(l.timestamp).getMonth() + 1 === selectedMonth)
                   .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, selectedMonth]);

    const handleGenerateForLog = async (log: ActionLog) => {
        if (!student) return;
        setGeneratingLogId(log.id);
        try {
            const prompt = buildLogPrompt(student, log);
            const result = await generateReport(prompt);
            await db.logs.update(log.id, { aiComment: result });
        } catch(err: any) {
            alert('AI 생성 중 오류 발생: ' + (err.message || err));
        } finally {
            setGeneratingLogId(null);
        }
    };

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

    const memoCount = logs?.filter((l: ActionLog) => (l.context && l.context.trim()) || (l.intervention && l.intervention.trim())).length || 0;

    const handleGenerate = async () => {
        if (!logs || !student) return;

        setLoading(true);
        try {
            const prompt = buildPrompt(activeTab, student, logs);
            const result = await generateReport(prompt);
            setReports(prev => ({ ...prev, [activeTab]: result }));

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
            <Navbar studentId={sid} />

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
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

                    {activeTab !== 'neis' && (
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
                    )}
                </div>

                {activeTab !== 'neis' && report && (
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

                {activeTab === 'neis' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col gap-6">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                            <div className="flex gap-2">
                                {availableMonths.map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => setSelectedMonth(m)}
                                        className={`px-4 py-2 text-sm font-bold transition-all ${selectedMonth === m ? 'bg-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300'}`}
                                    >
                                        {m}월
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => exportToExcel(logs || [], student)} className="text-emerald-700 hover:text-emerald-800 font-bold transition-colors flex items-center gap-2 text-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 px-4 py-2 rounded-xl shadow-sm">
                                <Download size={16} className="text-emerald-600" /> Excel 다운로드
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-200 transition-colors group">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-2 min-h-[4rem] h-full rounded-full mt-1 flex-shrink-0 ${log.intervention ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-baseline justify-between gap-4">
                                                <div className="flex items-baseline gap-3">
                                                    <h4 className="font-bold text-slate-800 text-base">{log.actionName}</h4>
                                                    <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {log.context && (
                                                    <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                        <MessageSquare size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{log.context}</p>
                                                    </div>
                                                )}
                                                {log.intervention && (
                                                    <div className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50">
                                                        <Shield size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm text-emerald-700 leading-relaxed max-w-2xl">{log.intervention}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-4 pt-4 border-t border-slate-100/80">
                                                {log.aiComment ? (
                                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-xl text-sm text-slate-700 border border-emerald-100/60 relative shadow-sm max-w-none prose prose-slate prose-sm text-left">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wide">
                                                            <Sparkles size={14} className="text-emerald-500" /> AI 누가기록 및 소명 자료
                                                        </div>
                                                        <div className="leading-relaxed text-slate-600 whitespace-pre-wrap">
                                                            {log.aiComment}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleGenerateForLog(log)}
                                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-semibold shadow-sm flex items-center gap-1"
                                                            disabled={generatingLogId === log.id}
                                                        >
                                                            {generatingLogId === log.id ? <Loader2 className="animate-spin" size={12} /> : null}
                                                            {generatingLogId === log.id ? "생성중..." : "다시 생성"}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleGenerateForLog(log)}
                                                        disabled={generatingLogId === log.id}
                                                        className="text-sm font-bold bg-white border-2 border-slate-200 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
                                                    >
                                                        {generatingLogId === log.id ? <Loader2 className="animate-spin text-emerald-500" size={16} /> : <Sparkles size={16} className="text-slate-400" />}
                                                        {generatingLogId === log.id ? "생성 중..." : "AI 누가기록 생성하기"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredLogs.length === 0 && (
                                <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <ClipboardList size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500 font-medium">선택한 달의 행동 기록이 없습니다.</p>
                                    <p className="text-sm text-slate-400 mt-1">상단에서 다른 달을 선택하거나 관찰을 기록하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
