export async function generateReport(prompt: string) {
    try {
        console.log("[기능적행동 평가도구] API 호출 시작...");

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `서버 오류 (${response.status})`);
        }

        const data = await response.json();
        return data.text;
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[기능적행동 평가도구] AI 리포트 생성 오류:", errMsg);
        throw new Error(`리포트 생성 실패: ${errMsg}`);
    }
}
