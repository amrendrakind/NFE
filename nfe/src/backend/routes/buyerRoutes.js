const buyerCtrl = require('../controllers/buyerCtrl');
const auth = require('../middleware/auth');
const buyerAdmin = require('../middleware/buyerAdmin');

module.exports = function (app){
    app.use(function(req,res,next){
       res.header(
        "Access-Control-Allow-Headers",
        "x-access-token, Origin, Content-Type, Accept"  
       );
       next();
    })

    app.post("/buyer/register",buyerCtrl.register);
    app.post("/buyer/login",buyerCtrl.login);
    app.get("/buyer/profile",auth,buyerCtrl.getBuyerInfor);
    app.patch("/buyer/editprofile",auth,buyerCtrl.editBuyer);
    app.get("/buyer/profile/all",auth,buyerAdmin,buyerCtrl.getUsersAllInfor);
    app.get('/buyer/home',auth,buyerCtrl.buyerHome);
    app.post('/buyer/order',auth,buyerCtrl.createOrder);
    app.get('/buyer/order',auth,buyerCtrl.getMyOrders);
    app.delete('/buyer/order/:id',auth,buyerCtrl.deletOrder);
    app.patch('/buyer/order/:id',auth,buyerCtrl.updateOrder);
    app.get('/buyer/notification',auth,buyerCtrl.getNotification);
    app.get('/buyer/order/:id',auth,buyerCtrl.agreeFarmerOrder);
    app.put('/buyer/order/:id',auth,buyerCtrl.reject_FarmerBid);
    app.post('/buyer/order/:id',auth,buyerCtrl.accept_FarmerBid);

    app.get('/buyer/myhistory',auth,buyerCtrl.getMyOrderHistory);
    app.get('/buyer/history',auth,buyerCtrl.getFarmerOrderHistory);
}