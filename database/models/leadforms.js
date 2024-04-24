module.exports = (sequelize, DataTypes) => {
  const LeadForms = sequelize.define(
    "leadforms",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNulls: false,
        primaryKey: true,
      },
      firstname: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      lastname: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      phonenumber: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      alternatephonenumber: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      emailaddress: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      previousaddress: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      currentaddress: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      dateofbirth: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      ssn: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      provider: {
        type: DataTypes.INTEGER,
        allowNulls: false,
      },
      service: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      referencenumber: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      accountnumber: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      monthlytotal: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      firstmonthbill: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      comments: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
    },
    {
      timestamps: true,
    }
  );

  return LeadForms;
};
