var {AuthenticationError} = require('apollo-server');
var secrets = require('../config/database.json');
var { verify } = require("jsonwebtoken");
module.exports =  {
  verifyTokenWithUserID(args, req) {
    if (args.accessToken != null) {
      try {
        const validData = verify(args.accessToken, secrets.ACCESS_TOKEN_SECRET);
        return validData.userID;
      } catch (ex) {
        throw new AuthenticationError("Invalid token.");
      }
    } else {
      return req.userID;
    }
  },
  verifyTokenWithUserIDWithLoginAsDetails(args, req) {
    if (args.accessToken != null) {
      try {
        const validData = verify(args.accessToken, secrets.ACCESS_TOKEN_SECRET);
        
       
        return {
          userID: validData.userID,
          loginAsId: validData.loginAsId,
          guid: validData.guid,
        };
      } catch (ex) {
        throw new AuthenticationError("Invalid token.");
      }
    } else {
      return {
        userID: req.userID,
        loginAsId: req.loginAsId,
        guid: req.guid,
      };
    
    }
  },
  isEmpty(value){
    if (value.toString().trim().length) {
      // We can return string or jsx as the 'error' prop for the validated Component
      return true;
    }
    return false;
  },
  async checkManagerIdIsNotValid(db,managerId){
    const count =  db.users.count({
      where: {
        id: managerId,
      },
    });

    return count == 0;
  },
  async checkDesignationIdIsNotValid(db,designationId){

    const count =  db.designations.count({
      where: {
        id: designationId,
      },
    });

    return count == 0;
  },
   
 
   
};
