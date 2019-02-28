var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//security
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcryptjs');
const saltRounds = 10;

var index = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(require('sanitize').middleware);
app.use(session({secret: 'project', saveUninitialized: false, resave: false}));

//database
var mysql = require('mysql');
var con = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'root',
    password : 'pass',
    database : 'project'
});

con.connect(function(err) {
    if(err) {
        console.log(err);
    }
    else {
        console.log('Connection to database established.');
    }
});

//routes
app.get('/', function(req, res) {
    res.render('index');
});

app.post('/register', function(req, res) {
    //sanitization
    var sanitizedNewUser = req.sanitize('newUsername').escape();
    var sanitizedNewPass = req.sanitize('newPassword').escape();
    var sanitizedNewPass2 = req.sanitize('newPassword2').escape();

    //input validation
    if(sanitizedNewUser.length == 0 || sanitizedNewPass.length == 0 || sanitizedNewPass2.length == 0) {
        req.checkBody('newUsername', 'Username is required.').notEmpty();
        req.checkBody('newPassword', 'Password is required.').notEmpty();
        req.checkBody('newPassword2', 'Please enter your password again to verify.').notEmpty();
    }
    if(sanitizedNewUser.length > 0) {
        req.checkBody('newUsername', 'Your username cannot be longer than 15 characters.').isLength({ max: 15 });
        req.checkBody('newUsername', 'Your username can only contain alphanumeric characters.').isAlphanumeric();
    }
    if(sanitizedNewPass.length > 0) {
        req.checkBody('newPassword', 'Your password cannot be longer than 15 characters.').isLength({ max: 15 });
        req.checkBody('newPassword', 'Your password can only contain alphanumeric characters.').isAlphanumeric();
    }
    if(sanitizedNewPass2.length > 0) {
        req.checkBody('newPassword2', 'Passwords do not match.').equals(req.body.newPassword);
    }

    var error = req.validationErrors();
    if(error) {
        req.session.errors = error;
        req.session.success = false;
        var errorMessage = JSON.stringify(error);
        res.send(errorMessage);
    }
    else {
        req.session.success = true;

        //password hashing
        bcrypt.hash(sanitizedNewPass, saltRounds, function(err, hash) {
            if(err) { throw err; }

            else {
                sanitizedNewPass = hash;

                var sql = 'INSERT INTO users (username, password) VALUES ("'+sanitizedNewUser+'", "'+sanitizedNewPass+'")';
                con.query(sql, function() {
                    res.send('successful');
                    console.log('Registration successful - added ' + sanitizedNewUser + ' to database.');
                });
            }
        });
    }
});

app.post('/login', function(req, res) {
    //sanitization
    var sanitizedUser = req.sanitize('username').escape();
    var sanitizedPass = req.sanitize('password').escape();

    //input validation
    if(sanitizedUser.length == 0 || sanitizedPass.length == 0) {
        req.checkBody('username', 'Username is required.').notEmpty();
        req.checkBody('password', 'Password is required.').notEmpty();
    }
    if(sanitizedUser.length > 0) {
        req.checkBody('username', 'Your username cannot be longer than 15 characters.').isLength({ max: 15 });
        req.checkBody('username', 'Your username can only contain alphanumeric characters.').isAlphanumeric();
    }
    if(sanitizedPass.length > 0) {
        req.checkBody('password', 'Your password cannot be longer than 15 characters.').isLength({ max: 15 });
        req.checkBody('password', 'Your password can only contain alphanumeric characters.').isAlphanumeric();
    }

    var error = req.validationErrors();
    if(error) {
        req.session.errors = error;
        req.session.success = false;
        var errorMessage = JSON.stringify(error);
        res.send(errorMessage);
    }
    else {
        req.session.success = true;

        //verify login details
        var sql = 'SELECT * FROM users WHERE username = "'+sanitizedUser+'" LIMIT 1';
        con.query(sql, function(err, users) {
            if(err) { throw err; }

            if(users.length == 0) {
                res.send('unauthorized');
                console.log('Login unsuccessful - invalid user.');
            }
            else {
                bcrypt.compare(sanitizedPass, users[0].password, function(err, validPass) {
                    if(err) { throw err; }

                    if(validPass) {
                        console.log('Login successful - redirecting ' + users[0].username + ' to dashboard.');
                        res.cookie('userCookie', sanitizedUser).send('authorized');
                    }
                    else {
                        res.send('unauthorized');
                        console.log('Login unsuccessful - invalid password.');
                    }
                });
            }
        });
    }
});

app.get('/inventory', function(req, res) {
    var sql = 'SELECT * FROM doughnuts';

    con.query(sql, function(err, result) {
        if(err) {
            throw err;
        }
        else {
            var donutInventory = JSON.stringify(result);
            res.send(donutInventory);
        }
    });
});

app.post('/inventory', function(req, res) {
    var stockQuantity = JSON.parse(req.body['stock']);

    //COOK: update stock quantity for each donut flavor
    for(var a = 0; a < 5; a++) {
        var stock = stockQuantity['donut'+(a+1)];

        var sql = 'UPDATE doughnuts SET stock_quantity = stock_quantity + "'+stock+'" WHERE id = "'+(a+1)+'"';
        con.query(sql, function(data) {
            console.log(data);
        });
    }

    res.send("Database updated!");
});

app.post('/order', function(req, res) {
    var order = JSON.parse(req.cookies.orderCookie);

    //update inventory for each donut after an order is submitted
    // - stock_quantity, + sales_volume, +sales price
    for(var a = 0; a < 5; a++) {
        var quantity = order['donut'+(a+1)];
        var sql = 'UPDATE doughnuts SET stock_quantity = stock_quantity - "'+quantity+'", sales_volume = sales_volume + "'+quantity+'", sales_price = sales_price + price * "'+quantity+'"  WHERE id = "'+(a+1)+'"';
        con.query(sql, function(data) {
            console.log(data);
        });
    }

    res.send("Database updated!");
});

app.use('/', index);
app.use('/users', usersRouter);

//catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

//error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
