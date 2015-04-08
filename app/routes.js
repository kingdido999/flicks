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
var uploadDir = '/uploads/';

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
				user: req.user,
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
				user: req.user,
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
		// get photos for this user
		var query = "\
			SELECT P.id, P.album_id, P.caption, P.path\
			FROM Photo P, Album A\
			WHERE P.album_id = A.id AND A.owner_id = ?";
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

	app.get('/profile/tags', isLoggedIn, function(req, res) {
		var query = "\
			SELECT DISTINCT T.name \
			FROM Album A, Photo P, Tag T \
			WHERE A.id = P.album_id AND P.id = T.photo_id AND A.owner_id = ?";
		var params = [req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('profile/tags', {
				user: req.session.user,
				tags: rows,
				photos: req.session.user.photos,
				tag_chosen: req.session.user.tag_chosen
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
		var renamedFile = rename(file.originalFilename);
		var newPath = rootDir + '/uploads/' + renamedFile;
		var relPath = uploadDir + renamedFile;

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

					// add tags for this photo if any tag exisits
					if (req.body.tags != '') {
						var photo_id = rows[0].insertId;
						var tags = req.body.tags.split(' ');

						var tagQuery = "INSERT INTO Tag (photo_id, name) VALUES ";
						var tagParams = [];

						for (var i = 0; i < tags.length; i++) {
							tagQuery += "(?, ?)";
							if (i < tags.length - 1) {
								tagQuery += ", ";
							}
							tagParams.push(photo_id);
							tagParams.push(tags[i]);
						}

						connection.query(tagQuery, tagParams, function(err, rows) {
								if (err) throw err;

								console.log('Tags added');
						});
					}

					console.log('File uploaded!');
					res.redirect('/upload');

				});
			});
		});
	});

	// =====================================
	// ALBUM ===============================
	// =====================================
	// create an album
	app.post('/createAlbum', function(req, res) {
		// if the album name is empty, return
		if (req.body.album == '') {
			console.log('Album name could not be empty!');
			res.redirect('/upload');
		} else {
			var query = "INSERT INTO Album (owner_id, name) VALUES (?, ?)";
			var params = [req.session.user.id, req.body.album];

			connection.query(query, params, function(err, rows) {
				if (err) throw err;

				res.redirect('/upload');
			});
		}
	});

	// delete an album
	app.post('/deleteAlbum', function (req, res) {
		var query = "\
			DELETE FROM Album WHERE id = ?;\
			UPDATE User SET num_albums = num_albums - 1 WHERE id = (\
				SELECT owner_id FROM Album WHERE id = ?)";
		var params = [req.body.album_id, req.body.album_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			console.log('Album deleted');
			res.redirect('/profile/albums');
		});
	});

	// =====================================
	// Photo ===============================
	// =====================================
	// delete a photo
	app.post('/deletePhoto', function(req, res) {
		var photo_id = req.body.photo_id;
		var photo_caption = req.body.photo_caption;
		var album_id = req.body.album_id;
		var photoPath = '.' + uploadDir + photo_caption;

		// delete this photo and decrement the number of photos in the album
		var query = "\
			DELETE FROM Photo WHERE id = ?;\
			UPDATE Album SET num_photos = num_photos - 1 WHERE id = ?";
		var params = [photo_id, album_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			// delete the photo in the file system
			fs.unlink(photoPath, function(err) {
				if (err) throw err;

				console.log('Photo deleted!');
				res.redirect('/profile/photos');
			})
		});
	});

	// =====================================
	// TAG =================================
	// =====================================
	// add tags to a photo
	app.post('/addTags', function(req, res) {
		// console.log(req.body);
		var tags = req.body.tags.split(' ');
		var photo_id = req.body.photo_id;

		for (var i = 0; i < tags.length; i++) {
			// create this tag and increment the number of tags for the photo
			var query = "\
				INSERT INTO Tag (photo_id, name) VALUES (?, ?);\
				UPDATE Photo SET num_tags = num_tags + 1 WHERE id = ?";
			var params = [photo_id, tags[i], photo_id];

			connection.query(query, params, function(err, rows) {
				if (err) throw err;
			});
		}

		console.log('Tags added!');
		res.redirect('/profile/photos');
	});

	// show photos with the tag that user clicked
	app.post('/showTaggedPhotos', function(req, res) {
		var tag_name = req.body.tag_name;
		var query = "\
			SELECT P.path \
			FROM User U, Album A, Photo P, Tag T \
			WHERE U.id = A.owner_id AND A.id = P.album_id AND P.id = T.photo_id \
			AND U.id = ? AND T.name = ?";
		var params = [req.session.user.id, tag_name];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.user.photos = rows;
			req.session.user.tag_chosen = tag_name;
			res.redirect('/profile/tags');
		});
	});

	// =====================================
	// FRIENDS =============================
	// =====================================
	app.get('/friends', isLoggedIn, function(req, res) {
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

function rename(filename) {
	return Date.now() + '_' + filename.toLowerCase();
}
