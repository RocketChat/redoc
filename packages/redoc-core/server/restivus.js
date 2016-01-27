import url from "url";

Meteor.startup(function() {
	let basename = s.rtrim(url.parse(__meteor_runtime_config__.ROOT_URL).pathname, '/');

	let Api = new Restivus({
		apiPath: basename + '/api'
	});

	Api.addRoute('updateDocs', { authRequired: false }, {
		post: function() {
			console.log(webHookUpdateDocs, this.request, this.bodyParams, CryptoJS.HmacSHA1(this.bodyParams, webHookUpdateDocs).toString());
			if (this.request && this.request.headers && this.request.headers['X-Hub-Signature'] === CryptoJS.HmacSHA1(this.bodyParams, webHookUpdateDocs).toString()) {
				let repo = this.bodyParams.repository.name;
				Meteor.call('redoc/getRepoData', repo);
				return { success: true };
			} else {
				return { success: false };
			}
		}
	});
})