const mongoose = require('mongoose');
const moment = require('moment')
const {ObjectId} = mongoose.Schema.Types;

const farmerOrderSchema = new mongoose.Schema({
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
        default : moment().format("MMMM Do YYYY")
    },
    postedTime : {
        type : String,
        default : moment().format(" h:mm:ss a")
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
        ref: "Farmer"   
    },
    boughtBy : {
        type : ObjectId,
        ref : "Buyer",
        default:null
    },
    isActive : {
        type : Boolean,
        default : true
    },
    agreedDate :{
        type : String
    },
    agreedTime : {
        type: String
    }
   
},{timeStamps:true})

module.exports = mongoose.model("FarmerOrder",farmerOrderSchema);