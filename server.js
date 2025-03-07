const express = require('express')
const cors = require('cors')
const app = express();
const cookieParser = require("cookie-parser")
const http = require('http').Server(app);
const io = require('socket.io')(http)
const mongoose = require('mongoose')
const PORT = 3000

app.use(cookieParser()); // to use cookie (res.cookies)
app.use(cors());
app.use(express.json())
app.use(express.urlencoded())

const UserModel = require('./models/Users')
const StatusModel = require('./models/Status')
const GroupMsgModel = require('./models/GroupMsgs');
const PrivateMsgModel = require('./models/PrivateMsgs')

// database 
const DB_CONN = "mongodb+srv://neetukoirala:as3uwJdBaAZkt2xX@cluster0.thpsb.mongodb.net/labtest-01?retryWrites=true&w=majority&appName=Cluster0"


mongoose.connect(DB_CONN, {
    useNewUrlParser:true,
    useUnifiedTopology:true
}).then(() => console.log('Database connection successful'))
.catch((err) => console.log(`Database connection error ${err}`));


/*
{
    username: "niko",
    password: "password"
}

*/
// login
app.route('/')
.get(async (req,res) => {
    const user = req.cookies.username
    if(user) {
        const status = await StatusModel.create({
            user: user,
            status: "logout"
        });
        status.save();
        res.clearCookie('username')
    }
    res.sendFile(__dirname + '/views/index.html');
}).post(async (req, res) => {
    // validate user input
    if(Object.keys(req.body).length === 0) {
        return res.status(400).send({
            status: false, 
            message: "All fields are required"
        });
    }
    try{
        const {username, password} = req.body;
        const user = await UserModel.findOne({username: username});
        if(user && (password === user.password)) {
            const status = await StatusModel.create({
                user: username, 
                status: "login"
            });
            status.save();
            res.cookie('username', user.username);
            res.writeHead(301, {Location: `http://localhost:3000/chat`});
            res.end();
        }else {
            res.clearCookie('username')
            res.status(400).send({
                status: false,
                message: "Invalid Username or Password"
            });
        }
    } catch (e) {
        res.status(500).send({
            status: false,
            message: e.message
        })
    }
})

// server control for sign up
app.route('/signup')
.get((req,res) => {
    res.sendFile(__dirname + '/views/signup.html');
}).post(async (req,res) => {
    const {username, firstname, lastname, password, createon} = req.body;
    console.log(req.body)

    if(Object.keys(req.body).length === 0){
        return res.status(400).send({
            status: false,
            message: "All fields are required"
        })
    }

    try{
        const oldUser = await UserModel.findOne({username: username});
        if(oldUser) {
            return res.status(400).send({
                status: false, 
                message: "User already exist. Please login"
            });
        }
        const newUser = new UserModel(req.body)
        await newUser.save();
        console.log("Registered successfully!")
        res.writeHead(301, {Location: '/'});
        res.end();
    }catch(e) {
        const duplicate = e.code === 11000;
        if(!(firstname && lastname && username && password && createon)){
            return res.status(400).send({
                status: false,
                message: "All fields are required"
            });
        }else if(duplicate){
            return res.status(400).send({
                status: false, 
                message: "This username is already registered"
            });
        }
        res.status(500).send({
            status: false,
            message: e.message
        })
    }
})

// chat 
app.get('/chat', (req,res) => {
    res.sendFile(__dirname + '/views/chat.html')
})

// private chat 
app.get('/private_chat', (req,res) => {
    res.sendFile(__dirname + '/views/private_chat.html')
})

// group chat 
app.get('/group_chat', (req,res) => {
    res.sendFile(__dirname + '/views/group_chat.html')
})

app.get('/users', (req, res) => {
    UserModel.find({})
    .then(data => {
        res.json(data);
    }).catch((err) => {
        res.status(404).json({"Error": "Users could not be retrieved"})
    })
})

io.on('connection', (socket) => {
    console.log('A user connecting...')

    socket.on('joinRoom', (room) => {
        console.log(`User ${socket.id} joined the room ${room}`)
        socket.join(room)
    })

    socket.on('leaveRoom', (room) => {
        console.log(`User ${socket.id} leaved the room ${room}`)
        socket.leave(room)
    })


    socket.on('join_user', (to_user) => {
        console.log(`User ${socket.id} joined with ${to_user}`)
        socket.join(to_user)
    })

    socket.on('leave_user', (to_user) => {
        socket.leave(to_user)
    })


    socket.on('sendMsg', (data) => {
        const msg = {
            msg: data.message,
            name: data.username
        }
        //socket.broadcast.to(data.room).emit('msg',msg)
        io.sockets.to(data.room).emit('msg',msg)
    })

    socket.on('messageRoom', (data) => {
        console.log(`User ${socket.id} sent message to room ${data.room}`)
        data.senderId = socket.id

        const message = {
            username: data.username,
            message: data.message
        }
        // console.log(`${data.username} sent a message to ${data.room}`)

        const dbGroupMsgModel = new GroupMsgModel({
            from_user: data.username,
            room: data.room,
            message: data.message
        })
        dbGroupMsgModel.save()

        console.log("drm:",data.room)

        //socket.broadcast.to(data.room).emit('newMessage', message)
        io.sockets.to(data.room).emit('newMessage',message);
    })

    socket.on('messageUser', (data) => {
        const message = {
            username: data.username,
            message: data.message
        }
        console.log(`${data.username} sent a message to ${data.to_username}`)

        const dbPrivateMsgModel = new PrivateMsgModel({
            from_user: data.username,
            to_user: data.to_username,
            message: data.message
        })
        dbPrivateMsgModel.save()
        console.log("du", data.username)
        console.log("du", data.to_username)

        socket.broadcast.to(data.username).emit('newMessage', message) 
        //socket.broadcast.to(data.to_username).emit('newMessage', message) 
    })


    socket.on("disconnect", () => {
        console.log("user disconnected...")
    })
})

http.listen(PORT, () => {
    console.log(`Server running at PORT ${PORT}`);
})

