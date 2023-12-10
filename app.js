//all required variables
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const routes = require("./routes/routes")(app);
app.use("/", routes);
app.use(methodOverride('_method'))
app.use(express.static("assets"));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true, 
    saveUninitialized: true
}));

app.use(express.urlencoded({extended: false}));
app.use(flash());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));

app.get("/users", (req,res)=>{
    connection.query(SQL);
});

const PORT = 9090;
app.listen( PORT, () => {
    console.log( "App running on http://localhost:" + PORT); } );