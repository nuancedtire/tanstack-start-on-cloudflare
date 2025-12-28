
import { drizzle } from 'drizzle-orm/d1';
import { audits } from '../src/server/db/schema';

export interface Env {
    DB: D1Database;
}

export default {
    async fetch(_request: Request, env: Env) {
        const db = drizzle(env.DB);

        // Clear existing data
        await db.delete(audits);

        // Seed data
        await db.insert(audits).values([
            {
                id: 'test-audit-1',
                patientToken: 'test-patient-1',
                arrivalDate: new Date().toISOString(),
                dateOfBirth: '1990-01-01',
                gender: 'Male',
                triagePerformed: true,
                riskLevel: 'Low',
                createdAt: new Date().toISOString()
            },
            {
                id: 'test-audit-2',
                patientToken: 'test-patient-2',
                arrivalDate: new Date().toISOString(),
                dateOfBirth: '1985-05-15',
                gender: 'Female',
                triagePerformed: true,
                riskLevel: 'High',
                createdAt: new Date().toISOString()
            }
        ]);

        return new Response('Seeded successfully');
    }
};
