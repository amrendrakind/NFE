const router = require('express').Router();
const uploadImage = require('../middleware/uploadImage');
const uploadCtrl = require('../controllers/uploadCtrl');


router.post('/photo',uploadImage,uploadCtrl.uploadPhoto)

module.exports = router;