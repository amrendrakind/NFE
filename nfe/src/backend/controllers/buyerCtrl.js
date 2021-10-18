const Buyer = require('../models/buyerModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/farmerModel');
const BuyerOrder = require('../models/buyerOrderModel');
const FarmerOrder = require('../models/farmerOrderModel');
const BuyerNotification = require('../models/buyerNotiModel')
const FarmerNotification = require('../models/farmerNotiModel')
const moment = require('moment');

const buyerCtrl = {

    ////////////////////////////////////  Auth Services  ///////////////////////////////////////////


    ////////////////// REGISTER BUYER  ////////////

    register: async (req, res) => {
        try {
            const { name, email, password
                , phoneNo, gender, location, product
            } = req.body;

            const buyer = await Buyer.findOne({ phoneNo });
            if (buyer) {
                return res.status(400).json({ msg: "Phone Number already exists" })
            }
            if (password.length < 6) {
                return res.status(400).json({ msg: "Password length too short" })
            }
            const passwordHash = await bcrypt.hash(password, 10);
            const newBuyer = new Buyer({
                name, email, password: passwordHash
                , phoneNo, gender, location, product
            });

            await newBuyer.save();

            res.json({ msg: "Registration successfull" })
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    /////////////////  LOGIN FARMER  //////////////////////////


    login: async (req, res) => {
        try {
            await Buyer.findOne({ phoneNo: req.body.phoneNo })
                .exec((err, user) => {
                    if (err) {
                        res.status(500).send({ message: err });
                        return;
                    }
                    if (!user) {
                        return res.status(404).send({ message: "User Not found." });
                    }

                    var passwordIsValid = bcrypt.compareSync(
                        req.body.password,
                        user.password
                    );

                    if (!passwordIsValid) {
                        return res.status(401).send({
                            accessToken: null,
                            message: "Invalid Password!"
                        });
                    }

                    var token = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, {
                        expiresIn: 86400 // 24 hours
                    });

                    var authorities = [];

                    if (user.role === 3) {

                        authorities.push("BuyerAdmin");
                    } else if (user.role === 2) {
                        authorities.push("Buyer")
                    }
                    res.status(200).send({
                        accessToken: token,
                        name: user.name,
                        email: user.email,
                        phoneNo: user.phoneNo,
                        role: authorities,
                        photo: user.photo,

                    });
                });

        } catch (err) {
            res.status(500).json({ msg: err.message })
        }
    },

    //////////////////////////////////////////////////  BUYER DETAILS   //////////////////////////////////////////////////

    /////////////////////////   GET BUYER INFORMATION   /////////////////////////

    getBuyerInfor: async (req, res) => {
        try {
            const buyer = await Buyer.findById(req.userId).select("-password")
                .populate({ path: "order", select: "product quantity baseRate postedDate boughtFrom dueDate isActive" })
                .populate({ path: "notification", select: "message createdAt " }).exec();
            var authorities = [];

            if (buyer.role === 3) {

                authorities.push("BuyerAdmin");
            } else if (buyer.role === 2) {
                authorities.push("Buyer")
            }
            res.status(200).send({

                photo: buyer.photo,
                role: authorities,
                name: buyer.name,
                email:buyer.email,
                phoneNo: buyer.phoneNo,
                order: buyer.order,
                location: buyer.location,
                gender: buyer.gender,
                notification: buyer.notification,
                product : buyer.product,
                orderCount: buyer.orderCount,
                isSeen:buyer.isSeen,
                isBid : buyer.isBid


            });

        } catch (err) {
            res.status(500).json({ msg: err.message });
        }
    },

    /////////////////////////   USER INFORMATION FOR ADMIN   /////////////////////////

    getUsersAllInfor: async (req, res) => {
        try {
            const buyer = await Buyer.find().select("-password");
            res.json(buyer);
        } catch (err) {
            res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   EDIT BUYER PROFILE   /////////////////////////


    editBuyer: async (req, res) => {
        try {
            const { photo, name, email,phoneNo,location,product } = req.body;
            const fieldsToUpdate = {};
            if (photo) fieldsToUpdate.photo = photo;
            if (name) fieldsToUpdate.name = name;
            if (email) fieldsToUpdate.email = email;
            if (phoneNo) fieldsToUpdate.phoneNo = phoneNo;
            if (location) fieldsToUpdate.location = location;
            if (product) fieldsToUpdate.product = product;
            const buyer = await Buyer.findByIdAndUpdate(req.userId, { $set: { ...fieldsToUpdate } }, {
                new: true, runValidators: true
            })
                .select("photo name email phoneNo location product");
            res.status(200).json({ success: true, data: buyer });
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    /////////////////////////   DELETE BUYER (ADMIN)   /////////////////////////

    deleteBuyer: async (req, res) => {
        try {
            await Buyer.findByIdAndDelete(req.params.id);
            res.json({ msg: "Deleted Farmer" });
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    /////////////////////////   BUYER HOME PAGE   /////////////////////////

    buyerHome: async (req, res) => {
        try {
            const buyer = await Buyer.findById(req.userId).select("-password");

            const farmer = await Farmer.find().where('product').in(buyer.product).exec();

            const orderId = farmer.map((user) => user.order).flat();

            const Order = await FarmerOrder.find({ _id: orderId, isActive: true })
                .populate({ path: "createdBy", select: "photo name location gender" })
                .sort("-postedDate")
                .lean()
                .exec();

            res.json(Order)


        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    ////////////////////////////////////////////////// BUYER ORDER DETAILS   /////////////////////////////////////////

    /////////////////////////   CREATE ORDER   /////////////////////////

    createOrder: async (req, res) => {
        try {

            const buyer = req.userId;

            const { product, quantity, baseRate, dueDate } = req.body;
            const activeOrder = await BuyerOrder.findOne({ createdBy: req.userId }).where("isActive").in(true)

            if (activeOrder) {
                return res.json({ msg: "Active Order already present" })
            }

            let order = new BuyerOrder({
                product, quantity, baseRate, dueDate,
                createdBy: buyer
            });


            await Buyer.findByIdAndUpdate(req.userId, {
                $push: { order: order._id },
                $inc: { orderCount: 1 }
            });

            let notification = new BuyerNotification({
                message: `A new Order with id : ${order._id} has been created by you`,
                createdBy: buyer
            })

            await Buyer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id },isSeen:false
            })
            await order.save();

            await notification.save();

            res.status(200).json({ success: true, data: order });

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   GET BUYER ORDER   /////////////////////////

    getMyOrders: async (req, res) => {
        try {
            const order = await BuyerOrder.find({ createdBy: req.userId })
            .populate({path:"boughtFrom",select:"name photo phoneNo orderCount location"})
                .sort("-postedDate -isActive")
                .lean()
                .exec();
            res.send(order);
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   EDIT ORDER   /////////////////////////

    updateOrder: async (req, res) => {
        try {
            const { product, quantity, baseRate, dueDate, isActive } = req.body;
            const fieldsToUpdate = {};
            if (product) fieldsToUpdate.product = product;
            if (quantity) fieldsToUpdate.quantity = quantity;
            if (baseRate) fieldsToUpdate.baseRate = baseRate;
            if (dueDate) fieldsToUpdate.dueDate = dueDate;
            if (isActive) fieldsToUpdate.isActive = isActive;
            const order = await BuyerOrder.findByIdAndUpdate(req.params.id, { $set: { ...fieldsToUpdate } }, {
                new: true, runValidators: true
            })
            let notification = new BuyerNotification({
                message: `Order with id : ${req.params.id} is updated by you`,
                createdBy: req.userId
            })

            await Buyer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id },isSeen:false
            })
            await notification.save();

            // res.json({ msg: "Order Updated" })
            res.status(200).json({ success: true, data: order });
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   DELETE ORDER   /////////////////////////

    deletOrder: async (req, res) => {
        try {
            await FarmerOrder.findByIdAndDelete(req.params.id)

            await Buyer.findByIdAndUpdate(req.userId, {
                $pull: { order: req.params.id },
                $inc: { orderCount: -1 }
            });
            let notification = new BuyerNotification({
                message: `Order with id : ${req.params.id} is deleted by you`,
                createdBy: req.userId

            })
            await notification.save();

            await Buyer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id },isSeen:false
            })
            res.json({ msg: "Order Deleted Successfully" })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////////////////  NOTIFICATION  //////////////////////////////////////////

    getNotification: async (req, res) => {
        try {
            const notification = await BuyerNotification.find({ createdBy: req.userId })
                .sort("-createdAt")
                .lean()
                .exec();
            res.send(notification);

            await Buyer.findByIdAndUpdate(req.userId, {
                 isSeen:true
            }) 

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    }, 

   

    /////////////////////////////////////  AGREE FARMERS' ORDER  //////////////////////////////////
    
    agreeFarmerOrder: async (req, res) => {
        try {
            const order = await FarmerOrder.findOne({ _id: req.params.id }).select()
                .populate({ path: "createdBy", select: "name phoneNo" });
            const farmer = order.createdBy;
            const FarmerPhone = order.createdBy.phoneNo;
            const FarmerName = order.createdBy.name
            const Active = order.isActive

            const buyer = await Buyer.findOne({ _id: req.userId })
            const BuyerPhone = buyer.phoneNo
            const BuyerName = buyer.name

            if (Active) {
                let buyerNotification = new BuyerNotification({
                    message: `You have agreed to Order with id : ${req.params.id}. You can contact ${FarmerName} by ${FarmerPhone} `,
                    createdBy: req.userId
                })
                

                await Buyer.findByIdAndUpdate({ _id: req.userId }, {
                    $push: { notification: buyerNotification._id, agreedOrderHistory: req.params.id },isSeen:false
                })
                await FarmerOrder.findOneAndUpdate({ _id: req.params.id }, {
                    boughtBy: req.userId, isActive: false , 
                    agreedDate : moment().format(" MMMM Do YYYY"),
                    agreedTime : moment().format("h:mm a")
                })

                let farmerNotification = new FarmerNotification({
                    message: `Your Order with id : ${req.params.id} has been agreed by ${req.userId}. You can contact ${BuyerName} by ${BuyerPhone}`,
                    createdBy: farmer
                })

                await Farmer.findOneAndUpdate({ _id: farmer }, {
                    $push: { notification: farmerNotification._id, myOrderHistory: req.params.id },isSeen :false
                })
                await buyerNotification.save();
                await farmerNotification.save();

                res.json("Agreed to this Offer")
            } else {
                return res.send("Order is not accessible")
            }
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    ////////////////////////////////////////  REJECT FARMERS' BID  ///////////////////////////////

    reject_FarmerBid: async (req, res) => {
        try {

            const buyer = await BuyerOrder.findOne({ _id: req.params.id })
            
            const farmer = buyer.bidBy
            const isBid = buyer.isBid
            // res.json(farmer)
            if (isBid) {

                let farmerNotification = new FarmerNotification({
                    message: `Your Bid for Order id :  ${req.params.id}  is rejected . `,
                    createdBy: farmer
                })

                await Farmer.findByIdAndUpdate(farmer, {
                    $push: { notification: farmerNotification._id }, isSeen: false
                })
                let buyerNotification = new BuyerNotification({
                    message: `You rejected the BID for Order id :  ${req.params.id} requested by   ${farmer}`,
                    createdBy: req.userId
                })

                await Buyer.findOneAndUpdate(req.userId, {
                    $push: { notification: buyerNotification._id }, isSeen :false, isBid:false
                })
                await BuyerOrder.findOneAndUpdate({ _id: req.params.id }, {
                    isActive: true, isBid: false, bidBy: null
                })
                await farmerNotification.save();
                await buyerNotification.save();
                res.json("Bidding rejected Succesfully")
            } else {
                return res.send("No active Bid for rejection")
            }
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    //////////////////////////////////////////// ACCEPT FARMERS' BID  //////////////////////////////

    accept_FarmerBid: async (req, res) => {
        try {
            const buyer = await BuyerOrder.findOne({ _id: req.params.id })
                .populate({ path: "createdBy", select: "name phoneNo" });
            const BuyerPhone = buyer.createdBy.phoneNo;
            const BuyerName = buyer.createdBy.name;
            const TotalAmount = parseInt(buyer.baseRate + buyer.bidAmount)

            const farmerId = buyer.bidBy
            const isBid = buyer.isBid

            const farmer = await Farmer.findOne({ _id: farmerId })

            // res.json(TotalAmount)
            if (isBid) {
                let farmerNotification = new FarmerNotification({
                    message: `Your Bid for Order id :  ${req.params.id}   is accepted. You can contact ${BuyerName} with Phone Number :  ${BuyerPhone} `,
                    createdBy: farmerId
                })
                await Farmer.findByIdAndUpdate({ _id: farmerId }, {
                    $push: { notification: farmerNotification._id, agreedOrderHistory: req.params.id },isSeen:false
                })
                let buyerNotification = new BuyerNotification({
                    message: `You accepted a BID for Order id :  ${req.params.id}.  You can contact  ${farmer.name}  with Phone Number :  ${farmer.phoneNo} `,
                    createdBy: req.userId
                })

                await Buyer.findOneAndUpdate({ _id: req.userId }, {
                    $push: { notification: buyerNotification._id, myOrderHistory: req.params.id } , isSeen:false,isBid:false
                })
                await BuyerOrder.findOneAndUpdate({ _id: req.params.id }, {
                    isActive:false, isBid: false, bidBy: null, boughtFrom: farmerId,baseRate : TotalAmount,
                    agreedDate : moment().format("MMMM Do YYYY"),
                    agreedTime : moment().format("h:mm a")
                })

                await farmerNotification.save();
                await buyerNotification.save();

                res.json("Accepted the Bid")
            } else {
                return res.json("No active BID to accept")
            }
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    //////////////////////////////////  BUYER ORDER HISTORY  ///////////////////////////

    getMyOrderHistory : async (req,res)=>{
        try {
            const orderHistory = await Buyer.findOne({_id:req.userId}).select("myOrderHistory -_id")
            .populate({path:"boughtBy",select:"name photo location phoneNo"});
            res.json(orderHistory)
           
        } catch (err) {
            return res.status(500).json({msg:err.message})
        }
    },

    getFarmerOrderHistory : async (req,res)=>{
        try {
           const Order = await FarmerOrder.find({boughtBy : req.userId})
           .populate({path:"createdBy",select:"name photo location phoneNo"});
           res.json(Order);
           
        } catch (err) {
            return res.status(500).json({msg:err.message})
        }
    }


}

function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

module.exports = buyerCtrl;