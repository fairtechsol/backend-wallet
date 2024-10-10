const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Sessioncommission1728453420471 {
    name = 'Sessioncommission1728453420471'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionCommission"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "sessionCommission" double precision NOT NULL DEFAULT '0'`);
    }
}
