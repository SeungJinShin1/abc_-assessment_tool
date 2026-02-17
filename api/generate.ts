import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { method?: string; body?: any };
type VercelResponse = ServerResponse & {
    status: (code: number) => VercelResponse;
    json: (data: any) => void;
    setHeader: (name: string, value: string) => void;
    end: () => void;
};

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
        console.error('GEMINI_API_KEY is not set in environment variables');
        return res.status(500).json({ error: 'API key not configured on server. Vercel 환경변수에 GEMINI_API_KEY를 설정하세요.' });
    }

    try {
        // Vercel은 JSON body를 자동 파싱하지만, 안전을 위해 체크
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch { /* ignore */ }
        }

        const prompt = body?.prompt;
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Invalid prompt: prompt 필드가 비어있습니다.' });
        }

        // Gemini API 호출 - gemini-3-pro-preview 모델 사용
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', response.status, errorData);
            return res.status(response.status).json({
                error: `Gemini API 오류 (${response.status})`,
                details: errorData
            });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
            console.error('Empty response from Gemini:', JSON.stringify(data));
            return res.status(500).json({ error: 'AI가 빈 응답을 반환했습니다.' });
        }

        return res.status(200).json({ text });
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Server error:', errMsg);
        return res.status(500).json({ error: `서버 내부 오류: ${errMsg}` });
    }
}
