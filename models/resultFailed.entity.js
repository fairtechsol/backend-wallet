const { EntitySchema } = require("typeorm");
const { baseColumnsSchemaPart } = require("../config/contants");

const resultFailedSchema = new EntitySchema({
  name: "resultFailed",
  columns: {
    ...baseColumnsSchemaPart,
    // use the createBy colum for the user id for which user is this data
    matchId: {
      type: "uuid",
      nullable: false,
    },
    betId: {
      type: "uuid",
      nullable: false,
    },
    userId: {
      type: "uuid",
      nullable: false,
    },
    result: {
      type: "varchar",
      nullable: false,
    },
  },
  relations: {
    user: {
      type: "one-to-one",
      target: "user",
      joinColumn: {
        name: "userId",
        referencedColumnName: "id",
      },
    },
  },
  indices: [
    {
      name: "resultFailed_createBy", // index name should be start with the table name
      unique: false, // Optional: Set to true if you want a unique index
      columns: ["matchId", "betId", "userId"],
    },
  ],
});

module.exports = resultFailedSchema;
