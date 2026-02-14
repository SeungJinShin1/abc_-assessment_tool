import Dexie, { type EntityTable } from 'dexie';

export interface ActionLog {
    id: number;
    studentId: number;
    actionId: number;
    actionName: string;
    timestamp: Date;
    context?: string;
}

export interface ActionPreset {
    id: number;
    name: string;
    color: string;
    type: 'behavior' | 'sensory';
}

export interface StudentProfile {
    id: number;
    name: string;
    grade?: string;
    memo?: string;
    sensoryProfile: {
        visual: number;
        auditory: number;
        tactile: number;
        vestibular: number;
        proprioceptive: number;
    };
}

export interface SavedReport {
    id?: number;
    studentId: number;
    reportType: 'parent' | 'neis' | 'semester';
    content: string;
    generatedAt: Date;
}

const db = new Dexie('FBAToolDatabase') as Dexie & {
    logs: EntityTable<ActionLog, 'id'>;
    actions: EntityTable<ActionPreset, 'id'>;
    students: EntityTable<StudentProfile, 'id'>;
    reports: EntityTable<SavedReport, 'id'>;
};

db.version(1).stores({
    logs: '++id, studentId, actionId, actionName, timestamp, context',
    actions: '++id, name, color, type',
    students: '++id, name',
});

db.version(2).stores({
    logs: '++id, studentId, actionId, actionName, timestamp, context',
    actions: '++id, name, color, type',
    students: '++id, name',
    reports: '++id, studentId, reportType, generatedAt',
});

// 기본 행동 프리셋만 자동 생성 (학생은 사용자가 직접 추가)
db.on('populate', async () => {
    await db.actions.bulkAdd([
        { name: '소리지르기', color: 'bg-red-500', type: 'behavior' },
        { name: '착석거부', color: 'bg-orange-500', type: 'behavior' },
        { name: '공격행동', color: 'bg-rose-600', type: 'behavior' },
        { name: '자해', color: 'bg-purple-600', type: 'behavior' },
        { name: '과제거부', color: 'bg-yellow-500', type: 'behavior' },
    ]);
});

export { db };
