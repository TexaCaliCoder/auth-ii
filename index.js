const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const validate = require('./helpers/validations');



const db = require('./helpers/helpers');
const server = express();

const PORT = 5555;
const jwtSecret = process.env.JWT_KEY ;

server.use(
    express.json(),
    logger('dev'),
    cors()
);

function generateToken(user) {
    const payload = {
        username: user.username,
        password: user.password
    }
    const options = {
        expiresIn: '1h',
        jwtid: '123'
    }
    return jwt.sign(payload, jwtSecret, options)
};

function gateKeeper(req, res, next){
    const token = req.headers.authorization;

    if(token){
        
        jwt.verify(token, jwtSecret, (err, decodedToken)=>{
            if(err){
                res.status(401).json({error: "Invalid Token"})
            }else{
                next();
            }
        })
    }else{
        res.status(401).json({message:"No Token Provided"})
    }
}




server.post('/api/register', (req, res) => {
    const user = req.body;
    const validateUser = Joi.validate(user, validate.user);
    if (validateUser.error) {
        res.status(406).json({
            error: "Please make sure you have a unique Username & Password with a min 6 chars"
        })
    } else {
        const hash = bcrypt.hashSync(user.password);
        user.password = hash;
        db.addUser(user)
            .then(ids => {
                const id = ids[0];
                db.userById(id).then(user => {
                    const token = generateToken(user);
                    res.status(201).json({
                        id: user.id,
                        message: "success",
                        token
                    })
                }).catch(err => {
                    res.status(500).send(err)
                })
            }).catch(err => {
                res.status(500).json({
                    message: 'issues'
                })
            })
    }
});

server.post('/api/login', (req, res)=>{
    const creds = req.body;
    db.login(creds).then(user=>{
        if(user && bcrypt.compareSync(creds.password, user.password)){
            const token = generateToken(user);
            res.json({token, message: 'access granted'})
        }else{
            res.status(401).json({message: "You shall not pass"});
        }
    }).catch(err=>{
        res.status(500).send(err);
    })
})

server.get('/api/users', gateKeeper, (req, res)=>{
    db.grabUserInfo().then(users=>{
        res.json(users)
    }).catch(err=>{
        res.status(500).send(err);
    })
})


server.listen(PORT, () => console.log(`server is running on ${PORT}`));