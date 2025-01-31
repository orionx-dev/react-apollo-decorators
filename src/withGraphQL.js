/* eslint-disable react/prop-types */
import {graphql} from '@apollo/client/react/hoc'
import React from 'react'
import Loading from './Loading'
import ErrorComponent from './Error'
import getVariables from './getVariables'
import NetworkError from './NetworkError'

export default function(query, userConfig = {}) {
  return function(ComposedComponent) {
    const defaultConfig = {
      loading: <Loading />,
      errorComponent: ErrorComponent,
      tryRefetch: 0
    }

    const config = {...defaultConfig, ...userConfig}
    class GraphQLQuery extends React.Component {
      hasData() {
        return Object.keys(this.props._data).length > 10
      }

      renderLoading() {
        if (!config.loading) return this.renderComposed()
        if (userConfig.loading) return config.loading
        // eslint-disable-next-line
        return global.apolloLoadingComponent ? <global.apolloLoadingComponent /> : config.loading
      }

      renderNetworkError() {
        if (this.hasData()) return this.renderComposed()
        if (!global.apolloNetworkErrorComponent && config.loading) return this.renderLoading()
        const GlobalComponent = global.apolloNetworkErrorComponent
        const ConfigComponent = userConfig.networkErrorComponent
        if (ConfigComponent !== null) {
          if (ConfigComponent) return <ConfigComponent />
          return GlobalComponent ? <GlobalComponent /> : <NetworkError />
        }
        return this.renderComposed()
      }

      renderError(error) {
        error = error || this.props.error
        if (error.networkError) return this.renderNetworkError()
        return global.apolloErrorComponent ? (
          // eslint-disable-next-line
          <global.apolloErrorComponent error={error} />
        ) : (
          <ErrorComponent error={error} />
        )
      }

      renderComposed() {
        try {
          return <ComposedComponent {...this.props} />
        } catch (error) {
          return this.renderError(error)
        }
      }

      render() {
        const {networkStatus, error} = this.props
        if (networkStatus === 1) {
          return this.renderLoading()
        }

        if (networkStatus < 7 && !this.hasData()) {
          return this.renderLoading()
        }

        if (error) {
          return this.renderError()
        }

        return this.renderComposed()
      }
    }

    const WithGraphQL = graphql(query, {
      ...config,
      props: ({ownProps, data}) => {
        return {
          _data: {
            ...(data.previousData ? {...data.previousData, ...data} : {...data}),
          },
          ...ownProps,
          ...(data.previousData ? {...data.previousData, ...data} : {...data}),
        }
      },
      options: props => {
        const options = config.options
        const userOptions = (typeof options === 'function' ? options(props) : options) || {}
        if (userOptions.pollInterval && !userOptions.fetchPolicy) {
          userOptions.fetchPolicy = 'network-only'
        }
        return {
          notifyOnNetworkStatusChange: true,
          fetchPolicy: 'cache-and-network', // default option
          ...userOptions,
          variables: {
            ...getVariables(query, config, props),
            ...(userOptions.variables || {})
          }
        }
      }
    })(GraphQLQuery)

    WithGraphQL.propTypes = ComposedComponent.propTypes
    WithGraphQL.defaultProps = ComposedComponent.defaultProps
    WithGraphQL.navigationOptions = ComposedComponent.navigationOptions

    return WithGraphQL
  }
}
