import {Kysely, Migration, MigrationProvider} from 'kysely'

const migrations: Record<string, Migration> = {}

export const migrationProvider: MigrationProvider = {
    async getMigrations() {
        return migrations
    },
}

migrations['001'] = {
    async up(db: Kysely<unknown>) {
        await db.schema
            .createTable('posts')
            .addColumn('createdAt', 'varchar', (col) => col.notNull())
            .addColumn('indexedAt', 'varchar', (col) => col.notNull())
            .addColumn('uri', 'varchar', (col) => col.primaryKey())
            .addColumn('cid', 'varchar', (col) => col.notNull())
            .execute()
        await db.schema
            .createTable('last_state')
            .addColumn('q', 'varchar', (col) => col.primaryKey())
            .addColumn('cursor', 'varchar', (col) => col.notNull())
            .execute()
    },
    async down(db: Kysely<unknown>) {
        await db.schema.dropTable('posts').execute()
        await db.schema.dropTable('last_state').execute()
    },
}
