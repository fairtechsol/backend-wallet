const { EntitySchema } = require('typeorm');
const { userRoleConstant, matchComissionTypeConstant, baseColumnsSchemaPart } = require("../config/contants");

const domainDataSchema = new EntitySchema({
  name: 'domainData',
  columns: {
    ...baseColumnsSchemaPart,
    userName: {
      type: 'varchar',
      nullable: false,
      unique: true
    },
    userId : {
      type: 'uuid',
      nullable: false,
      unique: true
    },
    domain: {
      type: 'varchar',
      nullable: false,
    },
    logo: {
      type: 'varchar',
      nullable: true
    },
    headerColor: {
      type: 'varchar',
      nullable: true
    },
    sidebarColor: {
      type: 'varchar',
      nullable: true
    },
    footerColor: {
      type: 'varchar',
      nullable: true
    },
  },
  orderBy: {
    "userName": "ASC"
  },
  indices: [
    {
      name: 'domainData_userName',   // index name should be start with the table name
      unique: true, // Optional: Set to true if you want a unique index
      columns: ['id', 'userName'],
    }
  ],
});

module.exports = domainDataSchema;
