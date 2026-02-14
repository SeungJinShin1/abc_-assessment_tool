import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { StudentProfile } from '../../lib/db';

interface SensoryRadarProps {
    profile: StudentProfile['sensoryProfile'];
}

export function SensoryRadar({ profile }: SensoryRadarProps) {
    const data = [
        { subject: '시각', A: profile.visual, fullMark: 10 },
        { subject: '청각', A: profile.auditory, fullMark: 10 },
        { subject: '촉각', A: profile.tactile, fullMark: 10 },
        { subject: '전정감각', A: profile.vestibular, fullMark: 10 },
        { subject: '고유수용감각', A: profile.proprioceptive, fullMark: 10 },
    ];

    return (
        <div className="w-full h-64 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">감각 프로파일</h3>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} hide />
                    <Radar
                        name="감각 프로파일"
                        dataKey="A"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
