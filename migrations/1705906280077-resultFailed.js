const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class ResultFailed1705906280077 {
    name = 'ResultFailed1705906280077'

    async up(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."resultFailed_createBy"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`CREATE INDEX "resultFailed_createBy" ON "resultFaileds" ("matchId", "betId", "userId") `);
    }
}
