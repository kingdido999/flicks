var passport = require('passport');
var flash    = require('connect-flash');

module.exports = {
  getLogin: function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('login.ejs', { message: req.flash('loginMessage') });
  },

  postLogin: passport.authenticate('local-login', {
    successRedirect : '/profile/photos', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }),

  getSignup: function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  },

  postSignup: passport.authenticate('local-signup', {
    successRedirect : '/profile/photos', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }),

  logout: function(req, res) {
		req.logout();
    if (typeof req.session.user != 'undefined') {
      delete req.session.user;
    }
		res.redirect('/');
	}
}
