// app/routes.js

// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

// set up file reading and writing
var fs = require('fs');
var path = require('path');
var rootDir = path.dirname(require.main.filename);

module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE ===========================
	// =====================================
	// photostream
	app.get('/', function(req, res) {
		var query = "SELECT path FROM Photo";

		connection.query(query, function(err, rows) {
			if (err) throw err;

			res.render('index/photos.ejs', {
				photos: rows
			});
		});
	});

	// albums
	app.get('/albums', function(req, res) {
		var query = "SELECT id, name, num_photos FROM Album";

		connection.query(query, function(err, rows) {
			if (err) throw err;

			res.render('index/albums.ejs', {
				albums: rows
			});
		});
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
            successRedirect : '/profile/photos', // redirect to the secure profile section
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
		successRedirect : '/profile/photos', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE =============================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile/photos', isLoggedIn, function(req, res) {
		var query = "\
			SELECT path FROM Photo P, Album A WHERE\
			P.album_id = A.id AND A.owner_id = ?";
		var params = [req.user.id]

		// store user in session
		req.session.user = req.user;

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('profile/photos', {
				user: req.session.user,
				photos: rows
			});
		});
	});

	app.get('/profile/albums', isLoggedIn, function(req, res) {
		var query = "SELECT id, name, num_photos FROM Album WHERE owner_id = ?";
		var params = [req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('profile/albums', {
				user: req.session.user,
				albums: rows
			});
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
	app.get('/upload', isLoggedIn, function(req, res) {
		var query = "SELECT id, name FROM Album WHERE owner_id = ?";
		var params = [req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('upload.ejs', {
				albums: rows
			});
		});
	});

	// upload a picture
	app.post('/upload', function(req, res) {
		// get the file object
		var file = req.files.uploadFile;
		var newPath = rootDir + '/uploads/' + file.originalFilename;
		var relPath = '/uploads/' + file.originalFilename;

		// insert a new photo
		// update the number of photos in album
		var query = "\
			INSERT INTO Photo (album_id, caption, path) VALUES (?, ?, ?);\
			UPDATE Album SET num_photos = num_photos + 1 WHERE id = ?";
		var params = [req.body.album, file.originalFilename, relPath, req.body.album];

		// read file from tmp storage
		fs.readFile(file.path, function(err, data) {
			// write file to the new path ./uploads/
			fs.writeFile(newPath, data, function(err) {
				if (err) throw err;

				connection.query(query, params, function(err, rows) {
					if (err) throw err;

					console.log('File uploaded!');
					res.redirect('/upload');
				});
			});
		});
	});

	// =====================================
	// ALBUM ==============================
	// =====================================
	// create an album
	app.post('/createAlbum', function(req, res) {
		var query = "INSERT INTO Album (owner_id, name) VALUES (?, ?)";
		var params = [req.session.user.id, req.body.album];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.redirect('/upload');
		});
	});

	// =====================================
	// FRIENDS ==============================
	// =====================================
	app.get('/friends', isLoggedIn, function(req, res) {
		// console.log(req.session.user);
		var user_id = req.session.user.id;
		var query = "\
			SELECT email FROM User WHERE id IN (\
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

	// search for users
	app.post('/findUsers', function(req, res) {
		// user does not provide any input
		// show all users except current user and his friend
		var query = "\
			SELECT email FROM User WHERE email != ?\
			AND id NOT IN (\
			SELECT friend_id FROM Friend WHERE user_id = ?)";

		var	params = [req.session.user.email, req.session.user.id];

		// user provides input
		if (req.body.user != '') {
			// show users that match the input
			query += " AND email LIKE ?";
			params.push('%' + req.body.user + '%');
		}

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.user.search_result = rows;
			res.redirect('/friends');
		});
	});

	// add a friend
	app.post('/addFriend', function(req, res) {
		// console.log(req.session.user.id);
		// console.log(req.body.friend);
		var user_id = req.session.user.id;
		var friend_email = req.body.friend;
		var query = "\
			INSERT INTO Friend (friend_id, user_id) VALUES (\
			(SELECT id FROM User WHERE email = ?), ?)";
		var params = [friend_email, user_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			removeItemFromArray('email', friend_email, req.session.user.search_result);
			res.redirect('/friends');
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

function removeItemFromArray(key, value, data) {
	for (var i = 0; i < data.length; i++) {
		if (data[i][key] == value) {
			data.splice(i, 1);
			break;
		}
	}

	return data;
}
