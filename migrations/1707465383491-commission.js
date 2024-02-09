const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Commission1707465383491 {
    name = 'Commission1707465383491'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchStartDate"`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchStartDate" TIMESTAMP WITH TIME ZONE`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchStartDate"`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchStartDate" TIME WITH TIME ZONE`);
    }
}
