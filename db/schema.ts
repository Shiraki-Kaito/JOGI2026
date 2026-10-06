import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{userId:text('user_id').primaryKey(),coins:integer('coins').notNull().default(0),owned:text('owned').notNull().default('[]'),equipped:text('equipped').notNull().default('none'),bestMs:integer('best_ms')});
export const runs=sqliteTable('runs',{userId:text('user_id').notNull(),runId:text('run_id').notNull(),coins:integer('coins').notNull(),timeMs:integer('time_ms').notNull(),claimed:integer('claimed').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.runId]})]);
