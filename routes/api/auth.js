const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator/check');


// @ route  GET api/auth
// @desc    Test route
// @access  Public
router.get('/', auth, async (req,res) => {
    try{
        const user = await User.findById(req.user.id).select('-password');
        return res.json(user);
    } catch(err){
        console.error(err.message);
        res.status(500).send('Server error');
    }
    res.send('Auth route');
});

// @ route  POST api/auth
// @desc    Authenticate User and Get Token
// @access  Public
router.post('/',[
    check('email'
        , 'Please include a valid email')
    .isEmail(),
    check('password'
         ,'Password required')
    .exists()
  ],async (req,res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { email, password } = req.body;
  
    // See if user exists
    try {
      let user = await User.findOne({ email });
  
      if(!user){
        return res
            .status(400)
            .json({errors: [ {msg: 'Invalid Credentials'} ]});
      }
      
      const isMatch = await bcrypt.compare(password, user.password);

      if(!isMatch){
        return res
        .status(400)
        .json({errors: [ {msg: 'Invalid Credentials'} ]});
      }

      
      const payload = {
        user:{
          id: user.id
        }
      };
  
      jwt.sign(payload
             ,config.get('jwtSecret')
             ,{ expiresIn: 360000000 },
             (err, token) => {
               if(err) throw err;
               res.json({ token });
             }
             )
  
      // Return jsonwebtoken
      
    } catch(err){
      console.error(err.message);
      res.status(500).send('Server error');
    }
    
  });

module.exports = router;