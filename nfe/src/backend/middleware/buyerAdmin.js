
const User = require('../models/buyerModel');
 
const buyerAdmin = async (req,res,next)=>{
    try {
        
        const user = await User.findOne({
            _id : req.userId    
        })
        if(user.role !== 0){
            return res.status(400).json({msg:"Admin access denied"})
        }

        next();
    } catch (err) {
        return res.status(500).json({msg:err.message})
    }
}

module.exports = buyerAdmin;