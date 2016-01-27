/*
 * scheduled processes so that we don"t don"t endless hit
 * external endpoints
 */

SyncedCron.add({
  name: "Update Repo Cache",
  schedule: function (parser) {
    let schedule = Meteor.settings.redoc.schedule || "every 1 days";
    return parser.text(schedule);
  },
  job: function () {
    return Meteor.call("redoc/getRepoData");
  }
});

SyncedCron.add({
  name: "Flush Docs Cache",
  schedule: function (parser) {
    let schedule = Meteor.settings.redoc.schedule || "every 4 hours";
    return parser.text(schedule);
  },
  job: function () {
    ReDoc.Collections.Docs.remove({});
  }
});

SyncedCron.start();

Meteor.startup(function () {
  // Import settings
  if (Meteor.settings.services) {
    for (let services of Meteor.settings.services) {
      for (let service in services) {
        // this is just a sanity check required by linter
        if ({}.hasOwnProperty.call(services, service)) {
          // actual settings for the service
          let settings = services[service];
          ServiceConfiguration.configurations.upsert({
            service: service
          }, {
            $set: settings
          });
          // if we have github credentials we'll also created
          // some an auth param string for api requests
          if (service === "github") {
            global.authString = `?client_id=${settings.clientId}&client_secret=${settings.secret}`;
            global.webHookUpdateDocs = settings.webhook ? settings.webhook.updateDocs : '';
          }
          console.log("service configuration loaded: " + service);
        }
      }
    }
  }

  // Initialize Repo data
  Meteor.call("redoc/initRepoData");
});
