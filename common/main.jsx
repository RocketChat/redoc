import Layout from "../common/layout.jsx";
import Docs from "../common/docs/docs.jsx";
import ReactCookie from "react-cookie";
import { createHistory, useBasename } from 'history'

const {Route, IndexRoute} = ReactRouter;

const AppRoutes = (
  <Route component={Layout} path="/">
    <Route component={Docs} path="/:repo/:branch/:alias" />
		<Route component={Docs} path="/:branch/:alias" />
    <IndexRoute component={Docs} />
  </Route>
);

let clientOptions = {
  props: {
    onUpdate() {
      // Notify the page has been changed to Google Analytics
      ga("send", "pageview");
    }
  }
}

let getBasename = function() {
  let el = document.createElement('a');
  el.href = __meteor_runtime_config__.ROOT_URL;
  if (el.pathname.substr(-1) !== '/') {
    return el.pathname + '/';
  }
  return el.pathname;
}

if (Meteor.isClient) {

  // Run our app under the /base URL.
  let history = useBasename(createHistory)({
    basename: getBasename()
  })

  // At the /base/hello/world URL:
  history.listen(function (location) {
    if (location.basename !== getBasename()) {
      location.pathname = "/";
      location.basename = getBasename();
    }
  })

  clientOptions.history = history
}

ReactRouterSSR.Run(AppRoutes, clientOptions, {
  preRender: (req, res) => {
    ReactCookie.plugToRequest(req, res);
  }
});

if (Meteor.isClient) {
  // Load Google Analytics
  /* eslint-disable */
  (function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,"script","//www.google-analytics.com/analytics.js","ga");
  /* eslint-enable */

  ga("create", Meteor.settings.public.ga.account, "auto");
  ga("send", "pageview");
}
