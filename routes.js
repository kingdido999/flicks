// routes.js

var routes = require('./handlers');
var auth = require('./handlers/auth');
var profile = require('./handlers/profile');
var upload = require('./handlers/upload');
var friends = require('./handlers/friends');
var photo = require('./handlers/photo');

module.exports = function(app, passport) {

	// =====================================
	// AUTHENTICATION ======================
	// =====================================
	app.get('/login', auth.getLogin);
	app.post('/login', auth.postLogin);
	app.get('/signup', auth.getSignup);
	app.post('/signup', auth.postSignup);
	app.get('/logout', auth.logout);

	// =====================================
	// HOME PAGE ===========================
	// =====================================
	app.get('/', routes.index);
	app.get('/albums', routes.album);
	app.get('/tags', routes.tags);
	app.post('/showAllTaggedPhotos', routes.showAllTaggedPhotos);

	// =====================================
	// PROFILE =============================
	// =====================================
	app.get('/profile/photos', isLoggedIn, profile.photos);
	app.get('/profile/albums', isLoggedIn, profile.albums);
	app.get('/profile/tags', isLoggedIn, profile.tags);
	app.post('/deleteAlbum', isLoggedIn, profile.deleteAlbum);
	app.post('/deletePhoto', isLoggedIn, profile.deletePhoto);
	app.post('/addTags', isLoggedIn, profile.addTags);
	app.post('/showUserTaggedPhotos', isLoggedIn, profile.showUserTaggedPhotos);

	// =====================================
	// UPLOAD ==============================
	// =====================================
	app.get('/upload', isLoggedIn, upload.getUpload);
	app.post('/upload', isLoggedIn, upload.postUpload);
	app.post('/createAlbum', isLoggedIn, upload.createAlbum);

	// =====================================
	// Photo ===============================
	// =====================================
	app.get('/photo', photo.getPhoto);
	app.post('/addComment', photo.addComment);
	app.post('/like', photo.like);
	app.post('/unlike', photo.unlike);

	// =====================================
	// FRIENDS =============================
	// =====================================
	app.get('/friends', isLoggedIn, friends.getFriends);
	app.post('/findUsers', isLoggedIn, friends.findUsers);
	app.post('/addFriend', isLoggedIn, friends.addFriend);
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
