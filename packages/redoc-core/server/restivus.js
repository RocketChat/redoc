import url from "url";

Meteor.startup(function() {
	let basename = s.rtrim(url.parse(__meteor_runtime_config__.ROOT_URL).pathname, '/');

	let Api = new Restivus({
		apiPath: basename + '/api'
	});

	Api.addRoute('updateDocs', { authRequired: false }, {
		post: function() {
			if (this.request && this.request.headers && this.request.headers['x-hub-signature'] === "sha1=" + CryptoJS.HmacSHA1(JSON.stringify(this.bodyParams), webHookUpdateDocs).toString()) {
				let repo = this.bodyParams.repository.name;
				let branch = this.bodyParams.refs.split('/').splice(-1)[0];
				Meteor.call('redoc/getRepoTOC', repo, branch);
				return { success: true };
			} else {
				return { success: false };
			}
		}
	});
})