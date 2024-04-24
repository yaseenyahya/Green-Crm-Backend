module.exports = (sequelize, DataTypes) => {
    const Designations = sequelize.define('designations',{
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        }, 
        name:{
            type: DataTypes.STRING,
            allowNulls:false,
            unique: {
                args: true,
                msg: 'Name already in use.'
            }
        },
        paneltype:{
            type: DataTypes.INTEGER,
            allowNulls:false
        }
      }, {

        timestamps: true
        
      });
     
    return Designations;
}