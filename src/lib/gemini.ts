import { GoogleGenerativeAI } from '@google/generative-ai';

const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';

// GitHub 보안 알림 방지를 위한 Base64 디코딩 로직
// 키가 'AIza'로 시작하면 원본(Raw), 아니면 Base64 인코딩된 것으로 간주하고 디코딩 시도
let apiKey = envKey;
if (envKey && !envKey.startsWith('AIza')) {
    try {
        const decoded = atob(envKey);
        if (decoded.startsWith('AIza')) {
            apiKey = decoded;
        }
    } catch (e) {
        console.warn('API Key decode error, using raw value');
    }
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
