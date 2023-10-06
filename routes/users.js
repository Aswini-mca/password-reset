import express from 'express';
import bcrypt from 'bcrypt'
import nodemailer from 'nodemailer'
import { genPassword, createUser, getUserByName,genRandomString,generateToken,storeRandom,getUserByRandomString,updateNewPassword } from '../helpers.js';
const router = express.Router()

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  // console.log(username,password)
  const isUserExist = await getUserByName(username)
  //validate username
  if (isUserExist) {
    res.status(400).send({ error: "Username already exists" })
    return
  }
  //validate username pattern
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(username)) {
    res.status(400).send({ error: "username pattern does not match" })
    return
  }

  //validate password pattern
  if (!/^(?=.*?[0-9])(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[#!@%$_]).{8,}$/g.test(password)) {
    res.status(400).send({ error: "password pattern does not match" })
    return
  }
  const hashedPassword = await genPassword(password)
  const result = await createUser(username, hashedPassword)
  res.status(201).json({message:"Successfully Created"})
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const userFromDB = await getUserByName(username)
  
  //validate username
  if (!userFromDB) {
    res.status(400).send({ error: "Invalid Credentials" })
    return
  }
  const storedDbPassword = userFromDB.password
  const isPasswordMatch = await bcrypt.compare(password, storedDbPassword)
  if (!isPasswordMatch) {
    res.status(400).send({ error: "Invalid Credentials" })
    return
  }
  const token = generateToken(userFromDB._id)
  res.status(201).json({ message: "Login successful",token })
})

router.post('/forget-password', async (req, res) => {
  const { username } = req.body
  const userFromDB = await getUserByName(username)

  //validate username
  if (!userFromDB) {
    res.status(400).send({ error: "Invalid Credentials" })
    return
  }
  //generating random string
  const randomString = genRandomString()
  const expirationTime = Date.now()+ 60*60*1000 //Expires in 1 hour
  const randomStringExpiresAt =  new Date(expirationTime)
  const storeRandomStringDb = await storeRandom(randomString,userFromDB,randomStringExpiresAt)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.email,
      pass: process.env.password
    }
  });

  // Function to send the email
  const sendEmail = {
    from: process.env.email,
    to: username,
    subject: "password reset request",
    text: `random string is${randomString}`,
    html:`<h2>The link for reset your password will expire in 1 hour.<a href='http://localhost:3000/reset-password/${randomString}'>Reset Password Link</a></h2>`
  };

  transporter.sendMail(sendEmail, (err, info) => {
    if (err) {
      console.log("Error sending email", err)
      res.status(500).json({ error: "Email not sent" })
    }
    else {
      console.log("Email sent", info.response)
      res.status(200).json({ message: "Email sent successfully,check your email click that Reset Password Link" })
    }
  })

})

router.post('/reset-password/:randomString',async (req,res)=>{
  const randomString = req.params.randomString
  const {newPassword,confirmPassword} = req.body
  
  try{
     const randomstring = await getUserByRandomString(randomString)
     
     // Check if the random string exists in the database
     if(!randomstring){
      return res.status(404).json({ error: 'Invalid random string' });
    }
    const currentTime = Date.now();
    const randomStringExpiration = randomstring.randomStringExpiresAt.getTime();

     // Check if the random string has expired
     if (currentTime > randomStringExpiration) {
      return res.status(400).json({ error: 'random string has expired' });
    }

    //check newPassword and confirmPassword are same
    if(newPassword!==confirmPassword){
      return res.status(404).json({ error: 'New password and confirm password are not same' });
    }

    // Update the user's password
    const hashedPassword = await genPassword(newPassword)
    const updatePassword = await updateNewPassword(randomstring,hashedPassword)
    return res.json({ message: 'Password reset successful' });
  }
  catch(error){
    return res.status(500).json({ message: 'Internal Server Error' });
  }
})

export const UsersRouter = router