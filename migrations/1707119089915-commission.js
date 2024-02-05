const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Commission1707119089915 {
    name = 'Commission1707119089915'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ADD "partnerShip" integer DEFAULT '100'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "partnerShip"`);
    }
}
