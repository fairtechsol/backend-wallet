const { EntitySchema } = require("typeorm");
const cardResultSchema = new EntitySchema({
  name: "cardResult",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    createdAt: {
      type: "timestamp with time zone",
      createDate: true,
    },
    updatedAt: {
      type: "timestamp with time zone",
      updateDate: true,
    },
    deletedAt: {
      type: "timestamp with time zone",
      deleteDate: true,
    },
    // use the createBy colum for the user id for which user is this data
    gameType: {
      type: "varchar",
      nullable: false,
    },
    result: {
      type: "jsonb",
      nullable: false,
    },
  },
  indices: [
    {
      name: "cardResult_type",
      columns: ["gameType"],
    },
  ],
});
module.exports = cardResultSchema;