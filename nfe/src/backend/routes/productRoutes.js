const productCtrl = require('../controllers/productCtrl');

module.exports = function (app){
    app.post('/product',productCtrl.addProduct);
    app.get('/products',productCtrl.getProducts);
    app.get('/product/:id',productCtrl.getProduct);
    app.delete('/product/:id',productCtrl.deleteProduct);
}

