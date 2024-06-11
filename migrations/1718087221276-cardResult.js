const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class CardResult1718087221276 {
    name = 'CardResult1718087221276'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "cardResults" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "gameType" character varying NOT NULL, "result" jsonb NOT NULL, CONSTRAINT "PK_4832e2c48eb7536491cb0eb57ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "cardResult_type" ON "cardResults" ("gameType") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."cardResult_type"`);
        await queryRunner.query(`DROP TABLE "cardResults"`);
    }
}
