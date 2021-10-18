const Product = require('../models/productModel');

const productCtrl = {

    addProduct: async (req, res) => {
        try {
            const { productName } = req.body;

            const product = await Product.findOne({productName});
            if (product) {
                return res.status(400).json({ msg: "Product exists.!" })
            }
            const newProduct = new Product({ productName });
            await newProduct.save();

            res.json({ msg: "Product added successfully" });
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    deleteProduct: async (req, res) => {
        try {
            await Product.findByIdAndDelete(req.params.id)
            res.json({ msg: "Deleted Product Successfully" });
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    getProducts: async (req, res) => {
        try {
            let products = [];
            const product = await Product.find();
            for (let i = 0; i < product.length; i++) {
                products.push(product[i].productName)
            }
            res.status(200).send(products);
            

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    getProduct: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);
            res.send(product);
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    }

}

module.exports = productCtrl;