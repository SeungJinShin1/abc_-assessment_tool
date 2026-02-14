import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export function useActions() {
    return useLiveQuery(() => db.actions.toArray());
}

export function useLogs(studentId?: number) {
    return useLiveQuery(
        () => {
            if (studentId === undefined) return db.logs.orderBy('timestamp').reverse().toArray();
            return db.logs.where('studentId').equals(studentId).reverse().sortBy('timestamp');
        },
        [studentId]
    );
}

export function useStudents() {
    return useLiveQuery(() => db.students.toArray());
}

export function useStudent(studentId?: number) {
    return useLiveQuery(
        async () => {
            if (studentId === undefined) return undefined;
            return db.students.get(studentId);
        },
        [studentId]
    );
}

export function useSavedReports(studentId?: number) {
    return useLiveQuery(
        async () => {
            if (studentId === undefined) return undefined;
            return db.reports.where('studentId').equals(studentId).toArray();
        },
        [studentId]
    );
}
