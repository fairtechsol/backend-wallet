const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class ResultFailed1705055901087 {
    name = 'ResultFailed1705055901087'

    async up(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."resultFailed_createBy"`);
        await queryRunner.query(`CREATE INDEX "resultFailed_createBy" ON "resultFaileds" ("matchId", "betId", "userId") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."resultFailed_createBy"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "resultFailed_createBy" ON "resultFaileds" ("matchId", "betId", "userId") `);
    }
}
