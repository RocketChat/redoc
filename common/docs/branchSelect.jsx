
export default React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    let branches = [];
    let repo = ReDoc.Collections.Repos.findOne({ repo: this.props.repo });
    if (repo) {
      branches = repo.branches.map(function(branch) {
        return branch.name;
      })
    }
    return {
      branches: branches
    };
  },

  handleChange(event) {
    if (this.props.onBranchSelect) {
      this.props.onBranchSelect(event.target.value);
    }
  },

  renderBranches() {
    return this.data.branches.map(function(branch) {
      return <option value={branch}>{branch}</option>
    });
  },

  render() {
    return (
      <div className="redoc control select">
        <select
          onChange={this.handleChange}
          ref="select"
          value={this.props.currentBranch}
        >
          {this.renderBranches()}
        </select>
        <div className="icon right">
          <i className="fa fa-angle-down"></i>
        </div>
      </div>
    );
  }
});
