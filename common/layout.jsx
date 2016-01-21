import Header from "./header/header.jsx";

export default BaseLayout = React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    let data = {
      isMenuVisible: false
    };

    if (Meteor.isClient) {
      data.isMenuVisible = Session.equals("isMenuVisible", true);
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
            {property: "og:title", content: "Rocket.Chat - The ultimate Open Source web chat platform"},
            {property: "og:description", content: "From group messages and video calls all the way to helpdesk killer features our goal is to become the number one cross-platform open source chat solution."},
            {property: "og:url", content: "https://docs.rocket.chat"},
            {property: "og:image", content: "https://docs.rocket.chat/images/logo.png"}
          ]}
          link={[
            {rel: "canonical", href: "https://docs.rocket.chat"},
            {rel: "icon", href: "/favicon.png", type: "type/png"}
          ]}
          title={"Rocket.Chat Docs"}
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
