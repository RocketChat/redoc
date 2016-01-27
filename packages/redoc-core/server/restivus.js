import url from "url";

Meteor.startup(function() {
	let basename = s.rtrim(url.parse(__meteor_runtime_config__.ROOT_URL).pathname, '/');

	let Api = new Restivus({
		apiPath: basename + '/api'
	});

	Api.addRoute('updateDocs', { authRequired: false }, {
		post: function() {
			if (this.bodyParams && this.bodyParams.hook && this.bodyParams.hook.config && webHookUpdateDocs && this.bodyParams.hook.config.secret === webHookUpdateDocs) {
				let repo = this.bodyParams.repository.name;
				Meteor.call('redoc/getRepoData', repo);
				return { success: true };
			} else {
				return { success: false };
			}
		}
	});
})