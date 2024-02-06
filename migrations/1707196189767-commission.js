const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Commission1707196189767 {
    name = 'Commission1707196189767'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchName" character varying`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchStartDate" TIME WITH TIME ZONE`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchStartDate"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchName"`);
    }
}
