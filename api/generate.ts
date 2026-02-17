import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { method?: string; body?: any };
type VercelResponse = ServerResponse & {
    status: (code: number) => VercelResponse;
    json: (data: any) => void;
    setHeader: (name: string, value: string) => void;
    end: () => void;
};

// 시도할 모델 목록 (우선순위 순서)
const MODELS = [
    'gemini-3-pro-preview', // 1순위: 유저가 강력히 원함
    'gemini-2.0-flash',     // 2순위: 현재 가장 안정적인 최신 모델
    'gemini-1.5-flash'      // 3순위: 비상용 (가장 빠르고 저렴)
];

async function tryGenerate(apiKey: string, prompt: string, model: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`Trying model: ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    if (!response.ok) {
        // 429(Too Many Requests)나 503(Service Unavailable)인 경우만 다음 모델 시도
        if (response.status === 429 || response.status === 503) {
            throw new Error(`RETRYable Error: ${response.status}`);
        }
        // 그 외 에러(400 등)는 즉시 실패 처리
        const errorData = await response.text();
        throw new Error(`Fateal API Error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
        throw new Error('Empty response from AI');
    }

    return text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server. Vercel 환경변수에 GEMINI_API_KEY를 설정하세요.' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch { /* ignore */ }
        }

        const prompt = body?.prompt;
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Invalid prompt: prompt 필드가 비어있습니다.' });
        }

        // 모델 Fallback 로직
        let lastError = '';
        for (const model of MODELS) {
            try {
                const text = await tryGenerate(apiKey, prompt, model);
                return res.status(200).json({ text, modelUsed: model }); // 어떤 모델 썼는지 정보 포함
            } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                console.warn(`Model ${model} failed: ${errMsg}`);
                lastError = errMsg;

                // Retry 가능한 에러가 아니면 루프 중단하고 바로 에러 리턴
                if (!errMsg.includes('RETRYable')) {
                    return res.status(500).json({ error: `API 요청 실패 (${model}): ${errMsg}` });
                }
                // Retry 가능한 에러면 다음 루프로(다음 모델 시도)
            }
        }

        // 모든 모델 실패 시
        console.error('All models failed');
        return res.status(500).json({
            error: '모든 AI 모델이 응답하지 않습니다. (429/503)',
            details: lastError
        });

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Server error:', errMsg);
        return res.status(500).json({ error: `서버 내부 오류: ${errMsg}` });
    }
}
