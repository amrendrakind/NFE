
const User = require('../models/farmerModel');
 
const farmerAdmin = async (req,res,next)=>{
    try {
        
        const user = await User.findOne({
            _id : req.userId    
        })
        if(user.role !== 3){
            return res.status(400).json({msg:"Admin access denied"})
        }

        next();
    } catch (err) {
        return res.status(500).json({msg:err.message})
    }
}

module.exports = farmerAdmin;