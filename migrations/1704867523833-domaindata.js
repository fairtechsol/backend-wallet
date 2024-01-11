const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Domaindata1704867523833 {
    name = 'Domaindata1704867523833'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD "userIdTemp" uuid NOT NULL`);
        await queryRunner.query(`UPDATE "domainDatas" SET "userIdTemp" = uuid("userId")`);
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" RENAME COLUMN "userIdTemp" TO "userId"`);


        await queryRunner.query(`ALTER TABLE "domainDatas" ADD CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb" UNIQUE ("userId")`);
        await queryRunner.query(`CREATE TABLE "resultFaileds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "matchId" uuid NOT NULL, "betId" uuid NOT NULL, "userId" uuid NOT NULL, "result" character varying NOT NULL, CONSTRAINT "REL_0c6dfa5539787ad66e424bab5c" UNIQUE ("userId"), CONSTRAINT "PK_b27d3ed4c4ca43f1bcf46a6d7e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "resultFailed_createBy" ON "resultFaileds" ("matchId", "betId", "userId") `);
        await queryRunner.query(`ALTER TABLE "resultFaileds" ADD CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" DROP CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca"`);
        await queryRunner.query(`DROP INDEX "public"."resultFailed_createBy"`);
        await queryRunner.query(`DROP TABLE "resultFaileds"`);
    }
}
