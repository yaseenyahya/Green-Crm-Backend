var { sign } = require("jsonwebtoken");
var secrets = require("../config/secrets.json");
var { verify } = require("jsonwebtoken");
class Auth {
  createTokensInCookies(userID,guid, response) {

    const refreshToken = sign(
      { userID: userID,guid:guid },
      secrets.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
    const accessToken = sign({ userID: userID,guid:guid }, secrets.ACCESS_TOKEN_SECRET, {
      expiresIn: "15min",
    });
    const current = new Date();
    const minutes15 = new Date();
    minutes15.setMinutes(current.getMinutes() + 15);
    const week1 = new Date();
    week1.setHours(current.getHours() + 24 * 7);

    response.cookie("refresh-token", refreshToken, { expires: week1 });
    response.cookie("access-token", accessToken, { expires: minutes15 });

    return { refreshToken, accessToken };
  }
  createTokensInCookiesForLoginAs(userID,loginAsId,guid, response) {
    const refreshToken = sign(
      { userID: userID,loginAsId:loginAsId,guid:guid },
      secrets.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );
    const accessToken = sign(
      { userID: userID,loginAsId:loginAsId,guid:guid },
      secrets.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15min",
      }
    );
 
 
    const current = new Date();
    const minutes15 = new Date();
    minutes15.setMinutes(current.getMinutes() + 15);
    const week1 = new Date();
    week1.setHours(current.getHours() + 24 * 7);

    response.cookie("refresh-token", refreshToken, { expires: week1 });
    response.cookie("access-token", accessToken, { expires: minutes15 });

    return { refreshToken, accessToken };
  }
  removeTokensInCookies(response) {
    response.clearCookie("refresh-token");
    response.clearCookie("access-token");
  }
}

module.exports = Auth;
