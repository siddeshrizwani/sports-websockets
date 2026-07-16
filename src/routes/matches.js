import { Router } from 'express';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';

export const matchRouter = Router();

// list matches
matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid query params', details: parsed.error.errors });
    }

    const { limit } = parsed.data;

    try {
        const query = db.select().from(matches).orderBy(matches.createdAt);
        const rows  = limit ? await query.limit(limit) : await query;

        return res.status(200).json({ data: rows });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch matches', details: JSON.stringify(e) });
    }
});

// create a match
matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime:   new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status:    getMatchStatus(startTime, endTime),
        }).returning();

        res.status(201).json({ data: event });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create match', details: JSON.stringify(e) });
    }
});
