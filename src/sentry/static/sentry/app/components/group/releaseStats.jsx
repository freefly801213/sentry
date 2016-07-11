import React from 'react';
import {History} from 'react-router';

import ApiMixin from '../../mixins/apiMixin';
import DropdownLink from '../dropdownLink';
import LoadingIndicator from '../loadingIndicator';
import LoadingError from '../loadingError';
import GroupReleaseChart from './releaseChart';
import MenuItem from '../menuItem';
import SeenInfo from './seenInfo';
import {t} from '../../locale';

const DEFAULT_ENV_NAME = '(default environment)';

const GroupReleaseStats = React.createClass({
  propTypes: {
    defaultEnvironment: React.PropTypes.string,
    group: React.PropTypes.object,
  },

  mixins: [
    ApiMixin,
    History,
  ],

  getDefaultProps() {
    return {
      defaultEnvironment: 'production',
    };
  },

  getInitialState() {
    let queryParams = this.props.location.query;
    return {
      loading: true,
      error: false,
      data: null,
      environment: (
          queryParams.hasOwnProperty('environment') ?
          queryParams.environment :
          this.props.defaultEnvironment),
    };
  },

  componentWillMount() {
    if (this.state.loading) {
      this.fetchData();
    }
  },

  componentWillReceiveProps(nextProps) {
    let queryParams = nextProps.location.query;
    if (queryParams.environment !== this.props.location.query.environment) {
      this.setState({
        environement: queryParams.query
      });
    }
  },

  shouldComponentUpdate(nextProps, nextState) {
    return (
      this.state.loading !== nextState.loading ||
      this.state.error !== nextState.error ||
      this.state.environment !== nextState.environment ||
      this.props.group.id !== nextProps.group.id
    );
  },

  fetchData() {
    let group = this.props.group;
    let env = this.state.environment;
    let stats = this.props.group.stats['24h'];

    let since = stats[0][0];
    let until = stats[stats.length - 1][0];

    this.api.request(`/issues/${group.id}/environments/${env}/`, {
      query: {
        since: since,
        until: until,
      },
      success: (data) => {
        this.setState({
          data: data,
          loading: false,
          error: false,
        });
      },
      error: () => {
        this.setState({
          data: null,
          loading: false,
          error: true,
        });
      }
    });
  },

  switchEnv(env) {
    if (this.state.environment === env)
      return;

    this.setState({
      environment: env,
    });

    let queryParams = Object.assign({}, this.props.location.query);
    queryParams.environment = env;

    this.history.pushState(null, this.props.location.path, queryParams);
  },

  render() {
    let group = this.props.group;
    let projectId = this.getProject().slug;
    let orgId = this.getOrganization().slug;
    let environment = this.state.environment;
    let data = this.state.data || {};
    let firstSeen = data.firstRelease && data.firstRelease.firstSeen;
    let lastSeen = data.lastRelease && data.lastRelease.lastSeen;

    let envList = ['production', 'staging', ''];

    return (
      <div className="env-stats">
        <h6><span>
          <DropdownLink title={environment || DEFAULT_ENV_NAME}>
            {envList.map((e) => {
              return (
                <MenuItem
                    isActive={environment == e}
                    onClick={this.switchEnv.bind(this, e)}>{e || DEFAULT_ENV_NAME}</MenuItem>
              );
            })}
          </DropdownLink>
        </span></h6>
        <div className="env-content">
          {this.state.loading ?
            <LoadingIndicator />
          : (this.state.error ?
            <LoadingError />
          :
            <div>
              <GroupReleaseChart
                group={group}
                release={data.lastRelease}
                environment={environment}
                statsPeriod="24h"
                title={t('Last 24 Hours')}
                firstSeen={firstSeen}
                lastSeen={lastSeen} />

              <GroupReleaseChart
                group={group}
                release={data.lastRelease}
                environment={environment}
                statsPeriod="30d"
                title={t('Last 30 Days')}
                className="bar-chart-small"
                firstSeen={firstSeen}
                lastSeen={lastSeen} />

              <h6 className="first-seen"><span>{t('First seen')}</span></h6>
              <SeenInfo
                  orgId={orgId}
                  projectId={projectId}
                  date={firstSeen}
                  release={data.firstRelease} />

              <h6 className="last-seen"><span>{t('Last seen')}</span></h6>
              <SeenInfo
                  orgId={orgId}
                  projectId={projectId}
                  date={lastSeen}
                  release={data.lastRelease} />
            </div>
          )}
        </div>
      </div>
    );
  }
});

export default GroupReleaseStats;
