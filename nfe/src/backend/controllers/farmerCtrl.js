const Farmer = require('../models/farmerModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const Buyer = require('../models/buyerModel');
const FarmerOrder = require('../models/farmerOrderModel')
const BuyerOrder = require('../models/buyerOrderModel');
const FarmerNotification = require('../models/farmerNotiModel')
const BuyerNotification = require('../models/buyerNotiModel')

const farmerCtrl = {

    ////////////////////////////////////  Auth Services  ///////////////////////////////////////////

    ////////////////// REGISTER FARMER  ////////////

    register: async (req, res) => {
        try {

            const { name, password
                , phoneNo, gender, location, product
            } = req.body;

            const farmer = await Farmer.findOne({ phoneNo });
            if (farmer) {
                return res.status(400).json({ msg: "Phone no. already exists" })
            }
            if (password.length < 6) {
                return res.status(400).json({ msg: "Password length too short" })
            }
            const passwordHash = await bcrypt.hash(password, 10);
            const newFarmer = new Farmer({
                name, password: passwordHash
                , phoneNo, gender, location, product

            });

            await newFarmer.save();

            res.json({ msg: "Registered Successfully..!" })
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    /////////////////  LOGIN FARMER  //////////////////////////

    login: async (req, res) => {
        try {
            await Farmer.findOne({ phoneNo: req.body.phoneNo })
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

                    if (user.role === 0) {

                        authorities.push("FarmerAdmin");
                    } else if (user.role === 1) {
                        authorities.push("Farmer")
                    }

                    res.status(200).send({
                        accessToken: token,
                        name: user.name,
                        phoneNo: user.phoneNo,
                        role: authorities,
                        photo: user.photo,

                    });
                });

        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    //////////////////////////////////////////////////  FARMER DETAILS   //////////////////////////////////////////////////

    /////////////////////////   GET FARMER INFORMATION   /////////////////////////

    getFarmerInfor: async (req, res) => {
        try {

            const farmer = await Farmer.findById(req.userId).select("-password")
                .populate({ path: "order", select: "product quantity baseRate postedDate boughtBy isActive dueDate " })
                .populate({ path: "notification", select: "message createdAt " }).exec();
            // res.json(farmer);
            var authorities = [];

            if (farmer.role === 0) {

                authorities.push("FarmerAdmin");
            } else if (farmer.role === 1) {
                authorities.push("Farmer")
            }
            res.status(200).send({

                photo: farmer.photo,
                role: authorities,
                name: farmer.name,
                phoneNo: farmer.phoneNo,
                order: farmer.order,
                location: farmer.location,
                gender: farmer.gender,
                notification: farmer.notification,
                product: farmer.product,
                orderCount: farmer.orderCount,
                isSeen: farmer.isSeen

            });

        } catch (err) {
            res.status(500).json({ msg: err.message });
        }
    },

    /////////////////////////   USER INFORMATION FOR ADMIN   /////////////////////////

    getUsersAllInfor: async (req, res) => {
        try {
            const user = await Farmer.find().select("-password");
            res.json(user);
        } catch (err) {
            res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   EDIT FARMER PROFILE   /////////////////////////

    editFarmer: async (req, res) => {
        try {
            const { photo, name, phoneNo, location, product } = req.body;
            const fieldsToUpdate = {};
            if (photo) fieldsToUpdate.photo = photo;
            if (name) fieldsToUpdate.name = name;
            if (phoneNo) fieldsToUpdate.phoneNo = phoneNo;
            if (location) fieldsToUpdate.location = location;
            if (product) fieldsToUpdate.product = product;
            const farmer = await Farmer.findByIdAndUpdate(req.userId, { $set: { ...fieldsToUpdate } }, {
                new: true, runValidators: true
            })
                .select("photo name phoneNo location product");
            res.status(200).json({ success: true, data: farmer });
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },

    /////////////////////////   DELETE FARMER (ADMIN)   /////////////////////////

    deleteFarmer: async (req, res) => {
        try {
            await Farmer.findByIdAndDelete(req.params.id);
            res.json({ msg: "Deleted Farmer" });
        } catch (err) {
            return res.status(500).json({ msg: err.message });
        }
    },


    /////////////////////////   FARMER HOME PAGE   /////////////////////////

    farmerHome: async (req, res) => {
        try {
            const farmer = await Farmer.findById(req.userId).select("-password");

            const buyer = await Buyer.find().where('product').in(farmer.product).exec();

            const orderId = buyer.map((user) => user.order).flat();


            const Order = await BuyerOrder.find({ _id: orderId, isActive: true })
                .populate({ path: "createdBy", select: "photo name location gender" })
                .sort("postedDate")
                .lean()
                .exec();

            res.json(Order)

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    ////////////////////////////////////////////////// FARMER ORDER DETAILS   /////////////////////////////////////////

    /////////////////////////   CREATE ORDER   /////////////////////////

    createOrder: async (req, res) => {
        try {

            const farmer = req.userId;

            const { product, quantity, baseRate, dueDate } = req.body;

            const activeOrder = await FarmerOrder.findOne({ createdBy: req.userId }).where("isActive").in(true)

            if (activeOrder) {
                return res.json({ msg: "Active Order already present" })
            }
            let order = new FarmerOrder({
                product, quantity, baseRate, dueDate,
                createdBy: farmer
            });

            await order.save();

            await Farmer.findByIdAndUpdate(req.userId, {
                $push: { order: order._id },
                $inc: { orderCount: 1 }
            });

            let notification = new FarmerNotification({
                message: `A new Order with id : ${order._id} has been created by you`,
                createdBy: farmer
            })
            await notification.save();

            await Farmer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id }, isSeen: false
            })

            res.status(200).json({ success: true, data: order });

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   GET FARMER ORDER   /////////////////////////

    getMyOrders: async (req, res) => {
        try {
            const order = await FarmerOrder.find({ createdBy: req.userId })
                .populate({ path: "boughtBy", select: "name phoneNo orderCount location photo" })
                .sort(" -isActive")
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
            const { product, quantity, baseRate, dueDate } = req.body;
            const fieldsToUpdate = {};
            if (product) fieldsToUpdate.product = product;
            if (quantity) fieldsToUpdate.quantity = quantity;
            if (baseRate) fieldsToUpdate.baseRate = baseRate;
            if (dueDate) fieldsToUpdate.dueDate = dueDate;
            // if (isActive) fieldsToUpdate.isActive = isActive;
            const order = await FarmerOrder.findByIdAndUpdate(req.params.id, { $set: { ...fieldsToUpdate } }, {
                new: true, runValidators: true
            }).select("product,quantity,baserate,dueDate");

            let notification = new FarmerNotification({
                message: `Order with id : ${req.params.id} is updated by you`,
                createdBy: req.userId
            })
            await notification.save();

            await Farmer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id }, isSeen: false
            })
            res.status(200).json({ success: true, data: order });
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    /////////////////////////   DELETE ORDER   /////////////////////////

    deletOrder: async (req, res) => {
        try {
            await FarmerOrder.findByIdAndDelete(req.params.id)

            await Farmer.findByIdAndUpdate(req.userId, {
                $pull: { order: req.params.id },
                $inc: { orderCount: -1 }
            });
            let notification = new FarmerNotification({
                message: `Order with id : ${req.params.id} is deleted by you`,
                createdBy: req.userId

            })
            await notification.save();

            await Farmer.findByIdAndUpdate(req.userId, {
                $push: { notification: notification._id }, isSeen: false
            })
            res.json({ msg: "Order Deleted Successfully" })
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },
    getNotification: async (req, res) => {
        try {
            const notification = await FarmerNotification.find({ createdBy: req.userId })
                .sort("-createdAt")
                .lean()
                .exec();
            res.send(notification);

            await Farmer.findByIdAndUpdate(req.userId, {
                isSeen: true
            })

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    agreeBuyerOrder: async (req, res) => {
        try {
            const order = await BuyerOrder.findOne({ _id: req.params.id }).select()
                .populate({ path: "createdBy", select: "name phoneNo" });
            const buyer = order.createdBy;
            const BuyerPhone = order.createdBy.phoneNo;
            const BuyerName = order.createdBy.name
            const Active = order.isActive

            const farmer = await Farmer.findOne({ _id: req.userId })
            const FarmerPhone = farmer.phoneNo
            const FarmerName = farmer.name

            if (Active) {
                let farmerNotification = new FarmerNotification({
                    message: `You have agreed to Order with id : ${req.params.id}. You can contact ${BuyerName} by ${BuyerPhone} `,
                    createdBy: req.userId
                })
                await farmerNotification.save();

                await Farmer.findByIdAndUpdate({ _id: req.userId }, {
                    $push: { notification: farmerNotification._id, agreedOrderHistory: req.params.id }, isSeen: false
                })
                await BuyerOrder.findOneAndUpdate({ _id: req.params.id }, {
                    boughtFrom: req.userId, isActive: false, agreedDate: moment().format("MMMM Do YYYY"), agreedTime: moment().format("h:mm a")
                })

                let buyerNotification = new BuyerNotification({
                    message: `Your Order with id : ${req.params.id} has been agreed.. You can contact ${FarmerName} by ${FarmerPhone}`,
                    createdBy: buyer
                })

                await buyerNotification.save();
                await Buyer.findOneAndUpdate({ _id: buyer }, {
                    $push: { notification: buyerNotification._id, myOrderHistory: req.params.id }, isSeen: false
                })
                res.json("Agreed to this Offer")
            } else {
                return res.send("Order is not accessible")
            }
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    bid_BuyerOrder: async (req, res) => {
        try {

            const order = await BuyerOrder.findOne({ _id: req.params.id }).select()
                .populate({ path: "createdBy", select: "name phoneNo" });
            const buyer = order.createdBy;
            const Active = order.isActive

            const farmer = await Farmer.findOne({ _id: req.userId })
            const FarmerName = farmer.name



            if (Active) {
                let farmerNotification = new FarmerNotification({
                    message: `You asked for a bid to Order id : ${req.params.id} . `,
                    createdBy: req.userId
                })

                await Farmer.findByIdAndUpdate({ _id: req.userId }, {
                    $push: { notification: farmerNotification._id }, isSeen: false
                })
                let buyerNotification = new BuyerNotification({
                    message: `Your Order with id : ${req.params.id} is asked for increasing  Rs.${order.bidAmount} by ${FarmerName}`,
                    createdBy: buyer
                })

                await Buyer.findOneAndUpdate({ _id: buyer }, {
                    $push: { notification: buyerNotification._id }, isSeen: false, isBid: true
                })
                await BuyerOrder.findOneAndUpdate({ _id: req.params.id }, {
                    bidBy: req.userId, isBid: true, isActive: false
                })
                await farmerNotification.save();
                await buyerNotification.save();
                res.json("Bidding Successfull")
            } else {
                return res.send("Bidding Failed")
            }
        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    getMyOrderHistory: async (req, res) => {
        try {
            const orderHistory = await FarmerOrder.find({ createdBy: req.userId, isActive: false })
                .populate({ path: "boughtBy", select: "name photo location phoneNo" });
            res.json(orderHistory)

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    },

    getBuyerOrderHistory: async (req, res) => {
        try {
            const Order = await BuyerOrder.find({ boughtFrom: req.userId }).
                populate({ path: "createdBy", select: "name photo location phoneNo" });
            res.json(Order);

        } catch (err) {
            return res.status(500).json({ msg: err.message })
        }
    }



}


module.exports = farmerCtrl;



