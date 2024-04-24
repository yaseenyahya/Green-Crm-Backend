const _ = require("lodash");
var { verify } = require("jsonwebtoken");
var secrets = require("../config/secrets.json");
var Auth = require("../auth");
var { AuthenticationError } = require("apollo-server");
var globalVars = require("./globalVars");
module.exports = {
  guidGenerator() {
    var S4 = function () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (
      S4() +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      S4() +
      S4()
    );
  },
  mergeObjectOnlyForCookies(req, validData) {
    Object.entries(validData).forEach(([key, value]) => {
      if (key != "iat" && key != "exp") {
        req[key] = value;
      }
    });
  },
  verifyAccessTokenAndPushDataToReq(accessToken, req,res) {
    const validData = null;
    try {
      validData = verify(accessToken, secrets.ACCESS_TOKEN_SECRET);
    } catch (e) {
      //console.log(e);
    }

    if (validData != null) {
      var subscriptionData = new globalVars().getSubscriptionData();
      var findUserAvailable = _.find(
        subscriptionData,
        (item) => item.agentId == validData.userID
      );

      if (findUserAvailable) {
        if (
          findUserAvailable.loggedIn &&
          findUserAvailable.guid != undefined &&
          findUserAvailable.guid != null
        ) {
          this.mergeObjectOnlyForCookies(req, validData);
        } else {
          this.forceUserLogout(res);
        }
      } else {
        this.forceUserLogout(res);
      }
      return true;
    }
  },
  forceUserLogout(res){
    new Auth().removeTokensInCookies(res);
    res.status(404).json({ errors: { AuthenticationError: "Session is expired." } });
  },
  async verifyRefreshTokenAndCreateAccessTokenAndPushDataToReq(
    refreshToken,
    db,
    req,
    res
  ) {
    var validData;

    try {
      validData = verify(refreshToken, secrets.REFRESH_TOKEN_SECRET);

    } catch (e) {
      //return next();
    }
    if (validData != null) {
      var subscriptionData = new globalVars().getSubscriptionData();
      var findUserAvailable = _.find(
        subscriptionData,
        (item) => item.agentId == validData.userID
      );

      if (findUserAvailable) {
        if (
          findUserAvailable.loggedIn &&
          findUserAvailable.guid != undefined &&
          findUserAvailable.guid != null
        ) {
          // token has been invalidated
          if (!(await this.checkUserIsActive(db, validData.userID))) {
            forceUserLogout(res)
            //return next();
          }
          if (this.isLoginAsAccountRequest(validData)) {
            new Auth().createTokensInCookiesForLoginAs(
              validData.userID,
              validData.loginAsId,
              validData.guid,
              res
            );
            this.mergeObjectOnlyForCookies(req, validData);
          } else {
            new Auth().createTokensInCookies(
              validData.userID,
              validData.guid,
              res
            );
            this.mergeObjectOnlyForCookies(req, validData);
          }
        } else {
          this.forceUserLogout(res);
        }
      } else {
        this.forceUserLogout(res);
      }
    } 
    return true;
  },
  isLoginAsAccountRequest(validData) {
    return validData.loginAsId != null && validData.loginAsId != undefined;
  },
  async checkUserIsActive(db, userID) {
    const user = await db.users.findOne({
      where: {
        id: userID,
      },
    });

    return user && user.status == 0;
  },
};
