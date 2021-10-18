const mongoose = require('mongoose');
const moment = require('moment');

const {ObjectId} = mongoose.Schema.Types;

const buyerOrderSchema = new mongoose.Schema({
    product : {
        type : String,
        required : true
    },
    quantity : {
        type : Number,
        required : true
    },
    baseRate : {
        type : Number,
        required : true
    },
    postedDate : {
        type : String,
        default : moment().format(" MMMM Do YYYY")
    },
    postedTime : {
        type : String,
        default : moment().format(" h:mm a")
    },
    postedDay : {
        type : String,
        default : moment().format("dddd")
    },
    dueDate : {
        type : String,
        required : true
    },
    createdBy : {
        type : ObjectId,
        ref: "Buyer"
    },
    boughtFrom : {
        type : ObjectId,
        ref : "Farmer",
        default: null
    },
    isActive : {
        type : Boolean,
        default : true
    },
    isBid : {
        type : Boolean,
        default : false
    },
    bidBy : {
        type : ObjectId,
        ref : "Farmer",
        default : null
    },
    bidAmount : {
        type : Number,
        default : 1
    },
    agreedDate :{
        type : String,
        
    },
    agreedTime : {
        type : String
    }
   
},{timeStamps:true})

module.exports = mongoose.model("BuyerOrder",buyerOrderSchema)