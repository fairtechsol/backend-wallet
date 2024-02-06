const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Commission1707207024738 {
    name = 'Commission1707207024738'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ADD "userName" character varying`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "userName"`);
    }
}
