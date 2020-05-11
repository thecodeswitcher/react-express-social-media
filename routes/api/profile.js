const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const request = require('request');
const config = require('config');

const { check, validationResult } = require('express-validator/check');

// @ route  GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me'
, auth
,async (req,res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate('user',
        ['name','avatar']);

        if(!profile){
            return res.status(400).json({msg: 'There is no profile for this user'});            
        }

        res.json(profile);

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');        
    }
});


// @ route  POST api/profile/
// @desc    Create/update user's profile
// @access  Private
router.post('/',[auth,
    check('status','Status is required')
    .not()
    .isEmpty(),
    check('skills', 'Skills is required')
        .not()
        .isEmpty()
], async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()})
    }

    const {
        company,
        website,
        location,
        bio,
        status,
        githubusername,
        skills,
        youtube,
        facebook,
        twitter,
        instagram,
        linkedin
    } = req.body;

    const profileFields = {};
    profileFields.user = req.user.id;
    if(company) profileFields.company = company;
    if(website) profileFields.website = website;
    if(location) profileFields.location = location;
    if(bio) profileFields.bio = bio;
    if(status) profileFields.status = status;
    if(githubusername) profileFields.githubusername = githubusername;
    if(skills) profileFields.skills = skills;
    
    if(skills) {
        profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    

    profileFields.social = {};
    if(youtube) profileFields.social.youtube = youtube;
    if(facebook) profileFields.social.facebook = facebook;
    if(twitter) profileFields.social.twitter = twitter;
    if(instagram) profileFields.social.instagram = instagram;
    if(linkedin) profileFields.social.linkedin = linkedin;    


    try {
        let profile = Profile.findOne({ user: req.user.id });

        if(profile) {
            console.log(`Profile exists for ${req.user.id}!`);

            // Update
            profile = await Profile.findOneAndUpdate(
                { user: req.user.id }, 
                { $set: profileFields },
                { new : true, upsert: true}
                );
            console.log(`Profile `, profile);
            return res.json(profile);
        }
        console.log("Creating a new profile!");
        profile = new Profile(profileFields);

        await profile.save();
        console.log(`profile `, profile);
        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }

});

// @ route  GET api/profile/
// @desc    All profiles
// @access  Public

router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find({}).populate('user', ['name', 'avatar']);
        return res.json(profiles);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');        
    }
})

// @route  GET api/profile/user/:user_id
// @desc   Get profile by user ID
// @access  Public

router.get('/user/:user_id', async (req, res) => {
    try {
        console.log(`Looking for profile of user ${req.params.user_id}`);
        const profile = await Profile.findOne({user: req.params.user_id}).populate('user', ['name', 'avatar']);
        // console.log(`Profile found for ${req.params.user_id}`,profile);
        if(!profile) return res.status(400).json({msg: 'There is no profile for this user'});
        
        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        console.log(`Error.kind is ${error.kind}`);
        res.status(500).send('Server Error');        
    }
})

// @route  DELETE api/profile/
// @desc    Delete user, profile, posts
// @access  Private

router.delete('/', auth,async (req, res) => {
    try {
        console.log(`req.user_id `, req.user_id);
        await Profile.findOneAndDelete({user: req.user.id});
        await User.findOneAndDelete({_id: req.user.id});
        //@to do delete all posts

        return res.json({msg: 'User deleted'});
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');        
    }
});

// @route  PUT api/profile/experience
// @desc    Add profile experience
// @access  Private

router.put('/experience', [auth,[
    check('title', 'Title is required')
    .not()
    .isEmpty(),
    check('company', 'Company is required')
    .not()
    .isEmpty(),
    check('from', 'From date is required')
    .not()
    .isEmpty()
]], async(req,res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()});
    }
    const {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;

    const newExp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    }

    try {
        const profile = await Profile.findOne({user:req.user.id});
        profile.experience.unshift(newExp);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
        
    }

})

// @route  DELETE api/profile/experience/:exp_id
// @desc    Delete experience from user profile
// @access  Private

router.delete('/experience/:exp_id',auth, async(req,res)=>{
    try {
    const profile = await Profile.findOne({user:req.user.id});
    // Get remove index
    const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);
    // console.log(`To remove experience at index ${req.params.exp_id}`);
    profile.experience.splice(removeIndex,1);
    await profile.save();
    res.status(200).json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');        
    }
});

// @route  PUT api/profile/education
// @desc    Add profile education
// @access  Private

router.put('/education', [auth,[
    check('school', 'School is required')
    .not()
    .isEmpty(),
    check('degree', 'Degree is required')
    .not()
    .isEmpty(),
    check('from', 'From date is required')
    .not()
    .isEmpty(),
    check('fieldofstudy', 'Field of study is required')
    .not()
    .isEmpty()
]], async(req,res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()});
    }
    const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
    } = req.body;

    const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
    }

    try {
        const profile = await Profile.findOne({user:req.user.id});
        profile.education.unshift(newEdu);
        await profile.save();
        res.json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
        
    }

})

// @route  DELETE api/profile/education/:edu_id
// @desc    Delete education from user profile
// @access  Private

router.delete('/education/:edu_id',auth, async(req,res)=>{
    try {
    const profile = await Profile.findOne({user:req.user.id});
    // Get remove index
    const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);
    // console.log(`To remove experience at index ${req.params.exp_id}`);
    profile.education.splice(removeIndex,1);
    await profile.save();
    res.status(200).json(profile);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');        
    }
});

// @route  GET api/profile/github/:username
// @desc   Get Github repos by user ID
// @access Public

router.get('/github/:username', (req,res) => {
    try {
    const options = {
        uri: `https://api.github.com/users${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
        method: 'GET',
        headers: {'user-agent': 'node.js'}
    };
    
    request(options, (error,response,body)=>{
        if(error) console.error(error);

        if(response.statusCode !== 200){
           console.log(`Response from Github `, body);
           return res.status(404).json({msg: 'No Github profile found'});            
        }
        res.json(JSON.parse(body));
    })
    } catch (con) {
        console.error(error.message);
        res.status(500).send('Server error');

    }
})


module.exports = router;