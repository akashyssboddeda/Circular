Circular.Views.Composer = Backbone.View.extend({
	el: ".composer",
	templateAvatar: $("#tpl-profile").html(),
	events: {
		"click #postnow":                     "postnow",
		"click #addtoposts":                  "addtoposts",
		"keyup #textarea":                    "countdown",
		"change #textarea":                   "countdown",
		"click #addpicture":                  "toggleDropzone",
		"click .picturezone button.close":    "resetPicturezone",
		"click .profile":                     "toggleProfile"
	},
	initialize: function(){
		// Handle query string value (generated by the bookmarklet)
		// and update countdown accordingly:
		this.$("#textarea").val(Circular.Utils.getParameterByName('p'));
		this.countdown();
		this.renderAvatars();
		
		Circular.events.on('posts:suggestpost', this.suggestpost, this);
		Circular.events.on('tab:selected', this.selectProfile, this);
		
		$(".dropzone").filedrop({
			url: "api/upload",
			allowedfiletypes: ['image/jpeg','image/png','image/gif'],
			dragOver: function(){ 
				$(this).addClass("over");
			},
			dragLeave: function(){ 
				$(this).removeClass("over");
			},
			drop: function(){
				$(this).removeClass("over");
			},
			uploadFinished: function(i, file, response, time) {
				$(".picturezone img").attr('src', response.thumbnail).data('picture', {url: response.url, thumbnail: response.thumbnail});
				$(".picturezone").show();
				$(".dropzone").hide();
			}
		});
	},
	renderAvatars: function(){
		this.$("#profiles").html('');
		_.each(Circular.users, function(user){
			var output = Mustache.render(this.templateAvatar, user);
			if (user.selected) {
				output = $(output).attr('title', $(output).attr('data-title-selected'));
			}
			else {
				output = $(output).attr('title', $(output).attr('data-title-select'));
			}
			this.$("#profiles").append(output);
		}, this);
	},
	postdata: function(){
		var post = {status: this.$("#textarea").val()};
		if (this.$(".picturezone img").data('picture')) {
			post.picture = this.$(".picturezone img").data('picture');
		}
		return post;
	},
	getPostsToSave: function(){
		var post = this.postdata();
		return _.map(this.getSelectedProfiles(), function(id){
			var p = _.clone(post);
			p.user = id;
			return p;
		});
	},
	postnow: function(e){
		var btn = $(e.target);
		Circular.events.trigger('button:setstate', btn, 'loading');
		setTimeout(function(){
			Circular.events.trigger('button:setstate', btn, 'reset');
			new Circular.Views.Alert({type: "alert-success", content: "This post has been successfully queued to be posted to Twitter"});
		}, 500);
		
		_.each(this.getPostsToSave(), function(post){
			post.time = "now";
			var postnow = new Circular.Models.Post(post);
			// As this model is outside of the collection, we have to specify a urlRoot to save it to 
			// (it's actually the same endpoint as the collection itself):
			postnow.urlRoot = "api/posts";
			postnow.save();
		});
		this.resetComposer();
	},
	addtoposts: function(){
		_.each(this.getPostsToSave(), function(post){
			this.collection.create(post, {wait: true, error: this.errorSave});
			// Wait for the server to respond with a Mongo id.
		}, this);
		this.resetComposer();
		Circular.events.trigger('track:post');
	},
	errorSave: function(){
		new Circular.Views.Alert({type: "alert-error", content: "Something went wrong while saving your post..."});
	},
	countdown: function(e){
		if (e) {
			var tweet = $(e.target).val();
		}
		else {
			var tweet = this.$("#textarea").val();
		}
		var len = twttr.txt.getTweetLength(tweet);
		if (len == 0) {
			this.$(".countdown").html("");
		}
		else {
			this.$(".countdown").html(140 - len).toggleClass("warning", len > 130);
			if (len > 140) {
				this.$("#postnow, #addtoposts").prop("disabled", true);
			}
			else {
				this.$("#postnow, #addtoposts").prop("disabled", false);
			}
		}
	},
	resetComposer: function(){
		this.$("#textarea").val("");
		this.countdown();
		this.resetPicturezone();
	},
	resetPicturezone: function(){
		this.$(".picturezone img").attr('src', "").data('picture', null);
		this.$(".picturezone").hide();
	},
	suggestpost: function(){
		var post = new Circular.Models.Post();
		this.$("#textarea").val(post.randomQuote());
		this.countdown();
	},
	toggleDropzone: function(e){
		$(e.currentTarget).tooltip('hide');
		this.$(".dropzone").slideToggle('fast');
	},
	toggleProfile: function(e){
		var profile = $(e.currentTarget);
		profile.toggleClass('selected');
		if (profile.hasClass('selected')) {
			profile.attr('title', profile.attr('data-title-selected'));
		}
		else {
			profile.attr('title', profile.attr('data-title-select'));
		}
		// Refresh Bootstrap tooltip:
		// Should this be fixed in Bootstrap?
		profile.tooltip('hide');
		profile.data('tooltip', false);
		profile.tooltip('show');
		// Update Circular.users itself:
		var id = profile.attr('data-id');
		Circular.users[id].selected = (Circular.users[id].selected) ? undefined : 'selected';
	},
	selectProfile: function(id){
		// Select this and only this profile:
		_.each(Circular.users, function(user){
			user.selected = undefined;
		});
		Circular.users[id].selected = 'selected';
		this.renderAvatars();
	},
	getSelectedProfiles: function(){
		return _.pluck(
			_.filter(Circular.users, function(user){
				return user.selected == 'selected';
			}),
			'id'
		);
	}
});

