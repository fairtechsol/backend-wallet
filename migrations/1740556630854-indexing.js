const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Indexing1740556630854 {
    name = 'Indexing1740556630854'

    async up(queryRunner) {
        await queryRunner.query(`CREATE INDEX "commission_betId" ON "commissions" ("betId") `);
        await queryRunner.query(`CREATE INDEX "commission_matchId" ON "commissions" ("matchId") `);
        await queryRunner.query(`CREATE INDEX "commission_createBy" ON "commissions" ("createBy") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."commission_createBy"`);
        await queryRunner.query(`DROP INDEX "public"."commission_matchId"`);
        await queryRunner.query(`DROP INDEX "public"."commission_betId"`);
    }
}
