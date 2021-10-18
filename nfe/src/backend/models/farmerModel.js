const mongoose = require('mongoose');

const {ObjectId} = mongoose.Schema.Types;

const farmerSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,"Please enter your name"],
        trim:true
    },
    password : {
        type : String,
        required : [true,"Please enter your password"]
    },
    phoneNo : {
        type : Number,
        required : [true,"Please enter your Phone Number"],
        unique : true
    },
    photo : {
        type : String,
        default:"https://res.cloudinary.com/mycartdb/image/upload/v1621404771/frmr_vrycol.jpg"
    },
    gender : {
        type : String
    },
    location : {
        type: String
    },
    product : {
        type : String,
    },
    role:{
        type:Number,
        default : 1
    },
    order : [{
        type : ObjectId,
        ref : "FarmerOrder"
    }],
    orderCount : {
        type : Number,
        default : 0
    },
     notification : [{
        type : ObjectId,
        ref : "FarmerNotif"
    }],
    myOrderHistory : [{
        type: ObjectId,
        ref : "FarmerOrder"
    }],
    agreedOrderHistory :[{
        type: ObjectId,
        ref : "BuyerOrder"
    }],

    isSeen :{
        type : Boolean,
        default:true
    }
   
   

    
});

module.exports = mongoose.model('Farmer',farmerSchema);