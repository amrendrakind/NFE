const mongoose = require('mongoose');
const moment = require('moment');
const {ObjectId} = mongoose.Schema.Types; 

const buyerNotifSchema = new mongoose.Schema({
    message: {
        type: String,
        
    },
    createdBy : {
        type : ObjectId,
        ref: "Buyer"   
    },
    time : {
        type : String,
        default : moment().format(" h:mm a")
    }
    ,
    Date : {
        type : String,
        default : moment().format("MMMM Do YYYY")
    }
    ,
    Day : {
        type : String,
        default : moment().format("dddd")
    }
    
},{
    timestamps : true
})

module.exports = mongoose.model('BuyerNotif',buyerNotifSchema);