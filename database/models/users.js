var bcrypt = require("bcrypt");
module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNulls: false,
        unique: {
          args: true,
          msg: "Username already in use.",
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      pseudonym: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      picture: {
        type: DataTypes.TEXT("long"),
        allowNulls: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNulls: false,
        unique: {
          args: true,
          msg: "Email already in use.",
        },
      },
      number: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNulls: false,
      },
      comments: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      settings: {
        type: DataTypes.TEXT("long"),
        allowNulls: true,
      },
      managerId: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      resetPasswordExpires: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      labels: {
        type: DataTypes.TEXT("long"),
        allowNulls: true,
      },
      agentlimitchatassign: {
        type: DataTypes.INTEGER,
        allowNulls: false,
        defaultValue:0
      },
      facebookPagesassign: {
        type: DataTypes.TEXT("long"),
        allowNulls: true,

      },
      pages:{
        type: DataTypes.TEXT("long"),
        allowNulls: true,
      }
    },
    {
      timestamps: true, //create createdat and updatedat

      hooks: {
        beforeCreate: (user) => {
          const salt = bcrypt.genSaltSync();
          user.password = bcrypt.hashSync(user.password, salt);
        },
        beforeUpdate: (user) => {
          if (user.changed("password")) {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync(user.password, salt);
          }
        },
      },
    }
  );

  Users.associate = (models) => {
    Users.belongsTo(models.designations, {
      foreignKey: "designationId",
      allowNull: false,
    });
  };
  return Users;
};
