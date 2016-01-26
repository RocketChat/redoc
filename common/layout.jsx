import Header from "./header/header.jsx";

export default React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    let data = {
      isMenuVisible: false
    };

    if (Meteor.isClient) {
      data.isMenuVisible = Session.equals("isMenuVisible", true);
    }

    if (__meteor_runtime_config__ && __meteor_runtime_config__.ROOT_URL) {
      data.rootURL = __meteor_runtime_config__.ROOT_URL;
      if (data.rootURL.substr(-1) !== '/') {
        data.rootURL += '/';
      }
    }

    return data;
  },

  handleOverlayClose() {
    if (Meteor.isClient) {
      Session.set("isMenuVisible", false);
    }
  },

  // TODO: Make this better, smarter, useable for more than just the menu
  renderOverlayForMenu() {
    if (this.data.isMenuVisible) {
      return (
        <div
          className="redoc overlay"
          onClick={this.handleOverlayClose}
        />
      );
    }
  },

  render() {
    return (
      <div className="redoc page">
        <ReactHelmet
          meta={[
            {name: "viewport", content: "width=device-width"},
            {property: "og:title", content: Meteor.settings.public.redoc.meta.title},
            {property: "og:description", content: Meteor.settings.public.redoc.meta.description},
            {property: "og:url", content: Meteor.settings.public.redoc.meta.url},
            {property: "og:image", content: Meteor.settings.public.redoc.meta.image}
          ]}
          link={[
            {rel: "canonical", href: Meteor.settings.public.redoc.meta.url},
            {rel: "icon", href: Meteor.settings.public.redoc.meta.favicon, type: "type/png"}
          ]}
          base={{"href": this.data.rootURL}}
          title={Meteor.settings.public.redoc.title}
        />

        <Header
          history={this.props.history}
          params={this.props.params}
        />
        {this.props.children}
        {this.renderOverlayForMenu()}
      </div>
    );
  }
});
