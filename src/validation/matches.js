import { z } from 'zod';

// ---------------------------------------------------------------------------
// Query / param schemas
// ---------------------------------------------------------------------------

export const listMatchesQuerySchema = z.object({
    limit: z
        .coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional(),
});

export const matchIdParamSchema = z.object({
    id: z
        .coerce
        .number()
        .int()
        .positive(),
});

// ---------------------------------------------------------------------------
// Status constants
// ---------------------------------------------------------------------------

export const MATCH_STATUS = {
    SCHEDULED: 'scheduled',
    LIVE:      'live',
    FINISHED:  'finished',
};

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

/**
 * Helper: returns true when the value is a valid ISO 8601 date string.
 */
const isIsoDate = (value) => !Number.isNaN(Date.parse(value));

export const createMatchSchema = z
    .object({
        sport:    z.string().min(1, 'sport is required'),
        homeTeam: z.string().min(1, 'homeTeam is required'),
        awayTeam: z.string().min(1, 'awayTeam is required'),

        startTime: z
            .string()
            .refine(isIsoDate, { message: 'startTime must be a valid ISO date string' }),

        endTime: z
            .string()
            .refine(isIsoDate, { message: 'endTime must be a valid ISO date string' }),

        homeScore: z
            .coerce
            .number()
            .int()
            .nonnegative()
            .optional(),

        awayScore: z
            .coerce
            .number()
            .int()
            .nonnegative()
            .optional(),
    })
    .superRefine((data, ctx) => {
        // Both values already passed the per-field ISO checks at this point.
        if (isIsoDate(data.startTime) && isIsoDate(data.endTime)) {
            if (new Date(data.endTime) <= new Date(data.startTime)) {
                ctx.addIssue({
                    code:    'custom',
                    path:    ['endTime'],
                    message: 'endTime must be chronologically after startTime',
                });
            }
        }
    });

export const updateScoreSchema = z.object({
    homeScore: z
        .coerce
        .number()
        .int()
        .nonnegative(),

    awayScore: z
        .coerce
        .number()
        .int()
        .nonnegative(),
});
