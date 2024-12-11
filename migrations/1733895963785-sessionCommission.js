const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class SessionCommission1733895963785 {
    name = 'SessionCommission1733895963785'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "sessionCommission" double precision NOT NULL DEFAULT '0'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionCommission"`);
    }
}
