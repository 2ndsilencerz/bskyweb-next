import SqliteDb from 'better-sqlite3'
import {Kysely, Migrator, SqliteDialect} from 'kysely'
import {DatabaseSchema} from './schema'
import {migrationProvider} from './migrations'

type BackgroundState = {
    cachedDB: Database;
    location: string;
};

function getState(): BackgroundState {
    const g = globalThis as unknown as { __backgroundState?: BackgroundState };
    if (!g.__backgroundState) {
        g.__backgroundState = {
            cachedDB: null as unknown as Database,
            location: '',
        };
    }
    return g.__backgroundState;
}

export const createDb = (location: string): Database => {
    return new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({
            database: new SqliteDb(location),
        }),
    })
}

export const migrateToLatest = async (db: Database) => {
    const migrator = new Migrator({db, provider: migrationProvider})
    const {error} = await migrator.migrateToLatest()
    if (error) throw error
}

export const startDB = async (location: string) => {
    const state = getState();
    const db = createDb(location)
    await migrateToLatest(db)
    state.cachedDB = db;
    state.location = location;
    console.log('Database started at', location);
    return db;
}

export const getDB = () => {
    const state = getState();
    if (!state.cachedDB) {
        console.error('Database not initialized. Reinitialize the database');
        state.cachedDB = createDb(state.location);
    }
    return state.cachedDB;
}

export type Database = Kysely<DatabaseSchema>
