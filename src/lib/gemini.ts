import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("[기능적행동 평가도구] VITE_GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export async function generateReport(prompt: string) {
    try {
        if (!apiKey || apiKey === 'your_api_key_here') {
            throw new Error("API 키가 설정되지 않았습니다. .env 파일을 확인하세요.");
        }

        console.log("[기능적행동 평가도구] API 호출 시작... 모델:", "gemini-3-flash-preview");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[기능적행동 평가도구] AI 리포트 생성 오류:", errMsg);
        throw new Error(`리포트 생성 실패: ${errMsg}`);
    }
}
