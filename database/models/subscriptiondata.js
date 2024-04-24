module.exports = (sequelize, DataTypes) => {
  const SubscriptionData = sequelize.define(
    "subscriptiondata",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      data: {
        type: DataTypes.TEXT('long'),
        allowNulls: true,

      },
      
    },
    {
      timestamps: true,
    }
  );

  return SubscriptionData;
};
