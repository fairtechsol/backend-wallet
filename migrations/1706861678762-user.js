const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class User1706861678762 {
    name = 'User1706861678762'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "totalComission"`);
        await queryRunner.query(`ALTER TABLE "userBalances" ADD "totalCommission" numeric(13,2) NOT NULL DEFAULT '0'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "userBalances" DROP COLUMN "totalCommission"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "totalComission" numeric(13,2) NOT NULL DEFAULT '0'`);
    }
}
