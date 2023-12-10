const QueryBuilder = require("node-querybuilder");
require("dotenv").config();
const bcrypt = require("bcrypt");

class LoginModel {
  constructor() {
    this.dbconfig = {
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

    this.pool = new QueryBuilder(this.dbconfig, "mysql", "pool");
  }

  async getUser(userDetails) {
    try {
      const qb = await this.pool.get_connection();
      const oneUser = await qb
        .where("username", userDetails.name)
        .where("pwd", userDetails.password)
        .get("users");

      console.log("oneUser", oneUser.length);
      qb.release();

      return oneUser;
    } catch (error) {
      console.log(error);
    }
  }

  async getUserByUsername(username) {
    console.log("username", username);
    try {
      const qb = await this.pool.get_connection();
      const oneUser = await qb.where("username", username).get("users");

      console.log("oneUser", oneUser.length);
      qb.release();

      return oneUser[0];
    } catch (error) {
      console.log(error);
    }
  }

  async getUsers() {
    try {
      const uqb = await this.pool.get_connection();
      const users = await uqb.get("users");
      console.log("users", users);
      uqb.release();
      return users;
    } catch (error) {
      console.log("error", error);
    }
  }

  async registerUser(data) {
    try {
      const ruqb = await this.pool.get_connection();
      const rv = await ruqb.returning("userID").insert("users", data);
      ruqb.release();
      return rv;
    } catch (error) {
      console.log("error", error);
    }
  }

  async login(username, password) {
    console.log("in db.login");

    try {
      let user = await this.getUserByUsername(username);
      console.log("user", user);
      let isKnownUser = await bcrypt.compare(password, user.pwd);
      return isKnownUser;
    } catch (error) {
      console.log("error", error);
    }
  }
}

module.exports = LoginModel;
