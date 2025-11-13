import { MigrationInterface, QueryRunner } from "typeorm";

export class AgentsColarysManualCreation1712345678906 implements MigrationInterface {
    name = 'AgentsColarysManualCreation1712345678906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Cette migration a été exécutée manuellement dans Supabase
        console.log('✅ Table agents_colarys créée manuellement dans Supabase');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // En cas de rollback, supprimer la table
        await queryRunner.query(`DROP TABLE IF EXISTS agents_colarys`);
    }
}