const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

const fileUpload = require('express-fileupload')

mongoose.connect(process.env.DATABASE_URL,{
    useCreateIndex : true,
    useNewUrlParser : true,
    useUnifiedTopology : true,
    useFindAndModify: false
},()=>{
    console.log("Database Connected..!")
})

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());

app.use(fileUpload({
    useTempFiles: true
}))

require('./routes/buyerRoutes')(app);  
require('./routes/farmerRoutes')(app);
require('./routes/productRoutes')(app);  
app.use('/upload',require('./routes/upload'));

app.listen(process.env.PORT || 8000,()=>{
    console.log("Listening to port 5000")
});
