const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class User1707215145512 {
    name = 'User1707215145512'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "remark" character varying`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "remark"`);
    }
}
