const jwt = require('jsonwebtoken');

const auth = (req,res,next)=>{

    const token = req.headers["x-access-token"];
    // console.log(token)
    if(!token){
        return res.status(400).json({msg:"Invalid Authentication"})
    }
    try{
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
             if(err){
                 return res.status(400).json({msg:"Invalid Authentication"})
             }

        req.userId = decoded.id;
        next();
        })
    }catch(err){
         return res.status(500).json({msg:err.message})
    }
}       

module.exports = auth;