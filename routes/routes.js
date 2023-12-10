//all necessary variables
const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const router = express.Router();
const path = require("path");
const mysql = require("mysql");
const flash = require("express-flash");
const fileUpload = require("express-fileupload");
const sharp = require("sharp");
const fs = require("fs");
require("ejs");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const acceptedMimeTypes = [
  "image/jpeg",
  "image/png"
];

const dbConfig = {
  user: "root",
  password: "SheepSheep22!",
  host: "localhost",
  database: "cs7025"
};

const session = require("express-session");
const connection = mysql.createConnection(dbConfig);
connection.connect(function (err) {
  console.log("Error: ", err);
});


const MySQLStore = require("express-mysql-session")(session);
const LoginModel = require("../models/loginmodel");
const dblogin = new LoginModel();

module.exports = function (app) {
  app.use(express.static(path.join(__dirname, "assets")));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../views"));
  app.set("trust proxy", "127.0.0.1"); // trust first proxy

  app.use(flash());
  app.use(fileUpload({
    limits: {
      fileSize: 2000000, // Around 2MB
    },
    abortOnLimit: true,
    limitHandler: fileTooBig,
  })
  );

  let dbOptions = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,

    createDatabaseTable: true,
    schema: {
      tableName: "custom_sessions",
      columnNames: {
        session_id: "custom_session_id",
        expires: "custom_expires_column_name",
        data: "custom_data_column_name",
      },
    },
  };

  const sessionStore = new MySQLStore(dbOptions);

  app.use(
    session({
      key: "session_cookie_name",
      secret: "session_cookie_secret",
      resave: true,
      saveUninitialized: true,
      store: sessionStore,
    })
  );

  sessionStore
    .onReady()
    .then(() => {
      // MySQL session store ready for use.
      console.log("MySQLStore ready");
    })
    .catch((error) => {
      // Something went wrong.
      console.error(error);
    });

  const urlencodedParser = bodyParser.urlencoded({ extended: false });

  let validationObject = [
    check("username")
      .exists()
      .not()
      .isEmpty()
      .trim()
      .withMessage("Is that really your name?")
      .escape(),
    check("password")
      .exists()
      .escape()
      .not()
      .isEmpty()
      .withMessage("Come on, we need your password!")
      .trim()
      .escape(),
  ];
  router.get("/login", (req, res) => {
    res.render("login.ejs");
  });



  router.get("/",  (req, res) => {
      //Super long SQL query that grabs all the data necessary to render on the home page, fixing that blank home page bug
      //add this query anywhere that needs to send data to the ejs
    const dataFetchsqlQuery = "SELECT images.imageID, images.imageName, images.uploadTime, users.username, COUNT(likes.imageID) AS totalLikes, comments.text AS commentText, comments.userID as commentUserID, commenter.username as commenterUsername FROM images INNER JOIN users ON images.userID = users.userID LEFT JOIN likes ON likes.imageID = images.imageID LEFT JOIN comments ON comments.imageID = images.imageID LEFT JOIN users AS commenter ON comments.userID = commenter.userID GROUP BY images.imageID, comments.commentID ORDER BY images.uploadTime DESC";

    // Execute the SQL query
    connection.query(dataFetchsqlQuery, (err, result) => {
      if (err) {
        console.log(err);
        return;
      }
  
      let images = [];
      let currentImageID = -1;
      let imageIndex = -1;

      result.forEach(row => {
        if (row.imageID !== currentImageID) {
          currentImageID = row.imageID;
          imageIndex++;
          images.push({
            imageName: row.imageName,
            uploadTime: row.uploadTime,
            username: row.username,
            totalLikes: row.totalLikes,
            comments: [],
          });
        }
        if (row.commentText) {
          images[imageIndex].comments.push({
            userID: row.commentUserID,
            text: row.commentText,
          });
        }
      });
  
      res.render('index.ejs', { images: images });
    });
  });



  router.post("/login", urlencodedParser, validationObject, async (req, res) => {
    
    // check if there is no malicious content in the request body
    const errors = validationResult(req);
    if (errors.errors.length >= 1) {
      console.log("errors", errors);
    } else {
      console.log("no errors");
      // take the form fields and check if we know the person
      let loggedIn = await dblogin.login(req.body.username, req.body.password);
      console.log("loggedIn", loggedIn);
      if (loggedIn == true) {
        // store the user on the session
        req.session.user = await dblogin.getUserByUsername(req.body.username);
        const dataFetchsqlQuery = "SELECT images.imageID, images.imageName, images.uploadTime, users.username, COUNT(likes.imageID) AS totalLikes, comments.text AS commentText, comments.userID as commentUserID, commenter.username as commenterUsername FROM images INNER JOIN users ON images.userID = users.userID LEFT JOIN likes ON likes.imageID = images.imageID LEFT JOIN comments ON comments.imageID = images.imageID LEFT JOIN users AS commenter ON comments.userID = commenter.userID GROUP BY images.imageID, comments.commentID ORDER BY images.uploadTime DESC";

    // Execute the SQL query
    connection.query(dataFetchsqlQuery, (err, result) => {
      if (err) {
        console.log(err);
        return;
      }
  
      let images = [];
      let currentImageID = -1;
      let imageIndex = -1;

      result.forEach(row => {
        if (row.imageID !== currentImageID) {
          currentImageID = row.imageID;
          imageIndex++;
          images.push({
            imageName: row.imageName,
            uploadTime: row.uploadTime,
            username: row.username,
            totalLikes: row.totalLikes,
            comments: [],
          });
        }
        if (row.commentText) {
          images[imageIndex].comments.push({
            userID: row.commentUserID,
            text: row.commentText,
          });
        }
      });
  
      res.render('index.ejs', { images: images });

        });
      } else {
        console.log("Send them back", loggedIn);
        res.render('login.ejs', { errorMessage: "Incorrect credentials! Maybe try keeping those on a post-it or something." });
      }
    }
  });


  router.get("/register", (req, res) => {
    res.render("register.ejs");
  });

  let validationResgisterObject = [
    check("firstName")
      .exists()
      .not()
      .isEmpty()
      .trim()
      .withMessage("Is that really your first name?")
      .escape(),
    check("lastName")
      .exists()
      .not()
      .isEmpty()
      .trim()
      .withMessage("Is that really your last name?")
      .escape(),
    check("email")
      .exists()
      .not()
      .isEmpty()
      .trim()
      .isEmail()
      .withMessage("Is that really your email address?")
      .escape(),
    check("password")
      .exists()
      .escape()
      .not()
      .isEmpty()
      .withMessage("Come on, we need your password!")
      .trim()
      .escape(),
    check("username")
      .exists()
      .escape()
      .not()
      .isEmpty()
      .withMessage("Sorry, I did not get your name."),
  ];

  router.post(
    "/register",
    validationResgisterObject,
    urlencodedParser,
    async (req, res) => {
      //take the form fields and enter the person into the dbase
      let data = {
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        pwd: await bcrypt.hash(req.body.password, 10),
      };
      console.log("data", data);
      let rv = await dblogin.registerUser(data);
      console.log("rv", rv);
      if (rv.affected_rows >= 1) {
        console.log("Entered in the database");
      }

      return res.render("login.ejs");
    }
  );

  return router;
};

router.post("/logout", (req, res) => {
  //destroy the session
  req.session.destroy(function (err) {
    // cannot access session here
    console.log("session logout error", err);
  });
  res.redirect("/");
});


function checkUserLoggedIn(req, res, next) {
  if (req.session.user) {
    console.log("checking user", req.session.user);
    return next();
  } else {
    return res.render("login.ejs");
  }
}

router.get("/imageUpload", (req, res) => {
  res.render("imageUpload.ejs");
});

//uploading image to the uploads/resized folder
router.post("/upload", checkUserLoggedIn, async (req, res) => {
  const image = req.files.picture;
  if (acceptedMimeTypes.indexOf(image.mimetype) >= 0) {
    const imageDestinationPath = __dirname + "/../assets/uploads/" + image.name;
    const resizedImagePath =
      __dirname + "/../assets/uploads/resized/" + image.name;

    console.log(image);

    await image.mv(imageDestinationPath).then(async () => {
      try {
        await sharp(imageDestinationPath)
          .resize(750)
          .toFile(resizedImagePath)
          .then(() => {
            fs.unlink(imageDestinationPath, function (err) {
              if (err) throw err;
              console.log(imageDestinationPath + " deleted");
            });
          });
      } catch (error) {
        console.log(error);
      }

      const userID = req.session.user.userID;
      const imageName = image.name;

      const sqlQueryInsertImage = "INSERT INTO images (userID, imageName) VALUES (?, ?)";
      connection.query(sqlQueryInsertImage, [userID, imageName], (err, result) => {
        if (err) {
          console.log(err);
          console.log(imageName);
          return;
        }
        if (result.affectedRows > 0) {

          connection.query("SELECT images.imageID, images.imageName, images.uploadTime, users.username, COUNT(likes.imageID) AS totalLikes, comments.text AS commentText, comments.userID as commentUserID, commenter.username as commenterUsername FROM images INNER JOIN users ON images.userID = users.userID LEFT JOIN likes ON likes.imageID = images.imageID LEFT JOIN comments ON comments.imageID = images.imageID LEFT JOIN users AS commenter ON comments.userID = commenter.userID GROUP BY images.imageID, comments.commentID ORDER BY images.uploadTime DESC"
          , (err, result) => {
            if (err) {
              console.log(err);
              return;
            }

            let images = [];
            let currentImageID = -1;
            let imageIndex = -1;
    
            result.forEach(row => {
              if (row.imageID !== currentImageID) {
                currentImageID = row.imageID;
                imageIndex++;
                images.push({
                  imageName: row.imageName,
                  uploadTime: row.uploadTime,
                  username: row.username,
                  totalLikes: row.totalLikes,
                  comments: [],
                });
              }
              if (row.commentText) {
                images[imageIndex].comments.push({
                  userID: row.commentUserID,
                  text: row.commentText,
                });
              }
            });
    
            res.render('index.ejs', { images: images });
    
          });
        }
      });

    });
  } else {
    res.render("imageUpload.ejs", { errorMessage: "This is an image sharing app.  Not sure what you think you're doing with that file type." });
  }
});


function fileTooBig(req, res, next) {
  res.render("imageUpload.ejs", {
    name: "",
    messages: { error: "Filesize too large" },
  });
}

//users can like an image as much as they want to show their level of enthusiasm
//A feature of the Deliagram brand :)
router.post('/like', bodyParser.urlencoded({ extended: false }), (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  } 
  const userID = req.session.user.userID;
  const imageName = req.body.imageName;
  const sqlQueryGetImageID = "SELECT imageID FROM images WHERE imageName = ?";
  connection.query(sqlQueryGetImageID, [imageName], (err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    if (result.length > 0) {
      const imageID = result[0].imageID;
      const sqlQueryInsertLikes = "INSERT INTO likes (userID, imageID) VALUES (?, ?)";
      connection.query(sqlQueryInsertLikes, [userID, imageID], (err, result) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log("Like stored in database");
        const sqlQueryGetLikes = "SELECT COUNT(*) AS totalLikes FROM likes WHERE imageID = ?";
        connection.query(sqlQueryGetLikes, [imageID], (err, result) => {
          if (err) {
            console.log(err);
            return;
          }

          const totalLikes = result[0].totalLikes;
          console.log(totalLikes);
          const data = { totalLikes: totalLikes };
          res.redirect("/");
        });
      });
    }
  });
  
});


router.post('/new-comment',  bodyParser.urlencoded({ extended: false }),(req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  const userID = req.session.user.userID;
  const commentText = req.body.commentText;
  const imageName = req.body.imageName;
  const sqlQueryGetImageID = "SELECT imageID FROM images WHERE imageName = ?";
  connection.query(sqlQueryGetImageID, [imageName], (err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    if (result.length > 0) { // check if any rows were returned by the query
      const imageID = result[0].imageID;
      const sqlQueryInsertComment = "INSERT INTO comments (userID, imageID, text) VALUES (?, ?, ?)";
      connection.query(sqlQueryInsertComment, [userID, imageID, commentText], (err, result)=>{
        if (err){
          console.log(err);
          return;
        }
        console.log("Comment stored in database");
        const sqlQueryGetComments = "SELECT text FROM comments WHERE imageID = ?";
        connection.query(sqlQueryGetComments, [imageID], (err, result) => {
          if (err) {
            console.log(err);
            return;
          }
          const commentText = result[0].commentText;
          console.log(commentText);
          const data = { commentText: commentText};
          res.redirect("/");
        });
        
        
      })
    }
  });
});








