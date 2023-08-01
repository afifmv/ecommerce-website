import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import multer from "multer";

const upload = multer({ dest: "public/uploads/" });
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/shoppingStoreDB");

const productSchema = new mongoose.Schema({
  name: String,
  stock: Number,
  price: Number,
  description: String,
  image: String,
  type: String,
});

const Product = new mongoose.model("Product", productSchema);

app.get("/", async (req, res) => {
  const products = await Product.find({}).exec();
  console.log(products);
  res.render("index.ejs", { products: products });
});

app.get("/admin", (req, res) => {
  res.render("admin.ejs");
});

app.get("/products/:type", async (req, res) => {
  const content = {
    products: await Product.find({ type: req.params.type }),
  };
  console.log(content);
  res.render("products.ejs", content);
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

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
