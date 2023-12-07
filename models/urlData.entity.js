const { EntitySchema } = require('typeorm');
const { userRoleConstant, matchComissionTypeConstant, baseColumnsSchemaPart } = require("./../config/contants");

const urlDataSchema = new EntitySchema({
  name: 'urlData',
  columns: {
    ...baseColumnsSchemaPart,
    userName: {
      type: 'varchar',
      nullable: false,
      unique: true
    },
    url: {
      type: 'varchar',
      nullable: false,
      unique: true
    },
    headerColor: {
      type: 'varchar',
      nullable: false
    },
    sideBarColor: {
      type: 'varchar',
      nullable: false
    },
    footerColor: {
      type: 'varchar',
      nullable: false
    },
  },
  orderBy: {
    "userName": "ASC"
  },
  indices: [
    {
      name: 'urlData_userName',   // index name should be start with the table name
      unique: true, // Optional: Set to true if you want a unique index
      columns: ['id', 'userName'],
    }
  ],
});

module.exports = urlDataSchema;
