import {
    pgTable,
    pgEnum,
    serial,
    text,
    integer,
    timestamp,
    jsonb,
    array,
} from 'drizzle-orm/pg-core';

// -------------------------------------------------------------------
// Enums
// -------------------------------------------------------------------

export const matchStatusEnum = pgEnum('match_status', [
    'scheduled',
    'live',
    'finished',
]);

// -------------------------------------------------------------------
// matches
// -------------------------------------------------------------------

export const matches = pgTable('matches', {
    id:        serial('id').primaryKey(),
    sport:     text('sport').notNull(),
    homeTeam:  text('home_team').notNull(),
    awayTeam:  text('away_team').notNull(),
    status:    matchStatusEnum('status').notNull().default('scheduled'),
    startTime: timestamp('start_time').notNull(),
    endTime:   timestamp('end_time'),
    homeScore: integer('home_score').notNull().default(0),
    awayScore: integer('away_score').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// -------------------------------------------------------------------
// commentary
// -------------------------------------------------------------------

export const commentary = pgTable('commentary', {
    id:        serial('id').primaryKey(),

    // Foreign key → matches.id
    matchId:   integer('match_id')
                   .notNull()
                   .references(() => matches.id, { onDelete: 'cascade' }),

    minute:    integer('minute'),           // match minute the event occurred
    sequence:  integer('sequence'),         // ordering within the same minute
    period:    text('period'),              // e.g. '1H', '2H', 'ET', 'PEN'
    eventType: text('event_type'),          // e.g. 'goal', 'yellow_card', 'substitution'
    actor:     text('actor'),               // player / person involved
    team:      text('team'),                // team the actor belongs to
    message:   text('message'),             // human-readable commentary text
    metadata:  jsonb('metadata'),           // flexible extra data (formations, coords, etc.)
    tags:      text('tags').array(),        // searchable labels e.g. ['goal', 'header']
    createdAt: timestamp('created_at').notNull().defaultNow(),
});
