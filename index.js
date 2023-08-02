import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import multer from "multer";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";

const upload = multer({ dest: "public/uploads/" });
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "E-Commerce Secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/shoppingStoreDB");

const reviewSchema = new mongoose.Schema({
  user: String,
  message: String,
  rating: Number,
});

const productSchema = new mongoose.Schema({
  name: String,
  stock: Number,
  price: Number,
  description: String,
  image: String,
  type: String,
  popularity: {
    type: Number,
    default: 0,
  },
  sale: {
    isSale: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      default: false,
    },
  },
  reviews: {
    type: [reviewSchema],
    default: [],
  },
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  my_cart: { type: [productSchema], default: [] },
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Product = new mongoose.model("Product", productSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", async (req, res) => {
  const products = await Product.find({}).exec();
  res.render("index.ejs", { products: products, user: req.user });
});

app.get("/admin", (req, res) => {
  res.render("admin.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/products/:type", async (req, res) => {
  const content = {
    products: await Product.find({ type: req.params.type }),
    user: req.user,
  };
  res.render("products.ejs", content);
});

app.get("/view/:id", async (req, res) => {
  const content = {
    product: await Product.findById(req.params.id),
    user: req.user,
  };
  res.render("viewProduct.ejs", content);
});

app.get("/checkout", (req, res) => {
  if (req.user) {
    res.render("checkout.ejs", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.post("/addproduct", upload.single("image"), async (req, res) => {
  const product = {
    name: req.body.name,
    price: req.body.price,
    stock: req.body.stock,
    description: req.body.description,
    image: req.file.filename,
    type: req.body.type.toLowerCase(),
  };
  try {
    await Product.insertMany([product]);
  } catch (error) {
    console.log(error);
  }
  res.redirect("/admin");
});

app.get("/addtocart/:id", async (req, res) => {
  const id = req.params.id;

  if (req.user) {
    var oldCart = req.user.my_cart;
    oldCart.push(await Product.findById(id).exec());
    await User.updateOne({ username: req.user.username }, { my_cart: oldCart });
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/");
        });
      }
    }
  );
});

app.post("/updateproduct", async (req, res) => {
  var isSale;
  var discount;
  if (req.body.sale > 0) {
    isSale = true;
    discount = req.body.sale;
  } else {
    isSale = false;
    discount = 0;
  }
  const updateFeature = {
    name: req.body.name,
    stock: req.body.stock,
    price: req.body.price,
    description: req.body.description,
    type: req.body.type.toLowerCase(),
    sale: {
      isSale: isSale,
      discount: discount,
    },
  };
  const response = await Product.updateOne(
    { _id: req.body.id },
    updateFeature
  ).exec();
  console.log(req.body);
  res.redirect("/admin");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/login", (req, res) => {
  const user = new User(req.body);

  req.login(user, function (err) {
    if (err) {
      res.redirect("/login", { message: "Invalid details" });
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.post("/addreview", async (req, res) => {
  if (req.user) {
    const review = {
      user: req.user.username,
      message: req.body.message,
      rating: req.body.rating,
    };
    var oldReviews = await Product.findById(req.body.id);
    oldReviews.reviews.push(review);
    await Product.updateOne({ _id: req.body.id }, oldReviews).exec();
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.get("/buy", async (req, res) => {
  req.user.my_cart.forEach(async (product) => {
    const stock = product.stock - 1;
    await Product.updateOne({ _id: product.id }, { stock: stock }).exec();
  });
  await User.updateOne({ username: req.user.username }, { my_cart: [] });
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
