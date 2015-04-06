// app/routes.js

// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.ejs'); // load the index.ejs file
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}));

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		req.session.user = req.user;

		res.render('profile.ejs', {
			user : req.user // get the user out of session and pass to template
		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// =====================================
	// UPLOAD ==============================
	// =====================================
	// app.post('/upload', function(req, res) {
	//
	// });

	// =====================================
	// FRIENDS ==============================
	// =====================================
	app.get('/friends', isLoggedIn, function(req, res) {
		console.log(req.session.user);
		var user_id = req.session.user.id;
		var query = "SELECT email FROM User WHERE id IN (\
			SELECT friend_id FROM Friend WHERE user_id = ?)";
		var params = [user_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('friends.ejs', {
				user: req.user,
				friends: rows,
				users: req.session.user.search_result
			});
		});
	});

	app.post('/findUsers', function(req, res) {
		var query = "";
		var params = null;

		// console.log(req.session.cookie);

		if (req.body.user == '') {
			// just show all users except current user
			query = "SELECT email FROM User WHERE email != ?";
			params = [req.session.user.email];
		} else {
			// show users that match with the search text entered
			query = "SELECT email FROM User WHERE email != ? AND email LIKE ?";
			params = [req.session.user.email, '%' + req.body.user + '%'];
		}

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.user.search_result = rows;
			res.redirect('/friends');
		});
	});

	app.post('/addFriend', function(req, res) {
		// console.log(req.session.user.id);
		// console.log(req.body.friend);
		var user_id = req.session.user.id;
		var friend_email = req.body.friend;
		var query = "INSERT INTO Friend (friend_id, user_id) VALUES (\
			(SELECT id FROM User WHERE email = ?), ?\
		)";
		var params = [friend_email, user_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.redirect('/friend');
		})
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
