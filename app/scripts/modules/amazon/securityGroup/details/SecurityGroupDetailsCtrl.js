'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.securityGroup.aws.details.controller', [
  require('angular-ui-router'),
  require('../../../securityGroups/securityGroup.read.service.js'),
  require('../../../securityGroups/securityGroup.write.service.js'),
  require('../../../confirmationModal/confirmationModal.service.js'),
  require('../../../utils/lodash.js'),
  require('../../../insight/insightFilterState.model.js'),
  require('../clone/cloneSecurityGroup.controller.js'),
])
  .controller('awsSecurityGroupDetailsCtrl', function ($scope, $state, resolvedSecurityGroup, app, InsightFilterStateModel,
                                                    confirmationModalService, securityGroupWriter, securityGroupReader,
                                                    $modal, _) {

    const application = app;
    const securityGroup = resolvedSecurityGroup;

    $scope.state = {
      loading: true
    };

    $scope.InsightFilterStateModel = InsightFilterStateModel;

    function extractSecurityGroup() {
      securityGroupReader.getSecurityGroupDetails(application, securityGroup.accountId, securityGroup.provider, securityGroup.region, securityGroup.vpcId, securityGroup.name).then(function (details) {
        $scope.state.loading = false;

        if (!details || _.isEmpty( details.plain())) {
          fourOhFour();
        } else {
          $scope.securityGroup = details;
        }
      },
      function() {
        fourOhFour();
      });
    }

    function fourOhFour() {
      $state.go('^');
    }

    extractSecurityGroup();

    application.registerAutoRefreshHandler(extractSecurityGroup, $scope);

    this.editInboundRules = function editInboundRules() {
      $modal.open({
        templateUrl: require('../configure/editSecurityGroup.html'),
        controller: 'awsEditSecurityGroupCtrl as ctrl',
        resolve: {
          securityGroup: function() {
            return angular.copy($scope.securityGroup.plain());
          },
          application: function() { return application; }
        }
      });
    };


    this.cloneSecurityGroup = function cloneSecurityGroup() {
      $modal.open({
        templateUrl: require('../clone/cloneSecurityGroup.html'),
        controller: 'awsCloneSecurityGroupController as ctrl',
        resolve: {
          securityGroup: function() {
            var securityGroup = angular.copy($scope.securityGroup.plain());
            if(securityGroup.region) {
              securityGroup.regions = [securityGroup.region];
            }
            return securityGroup;
          },
          application: function() { return application; }
        }
      });
    };

    this.deleteSecurityGroup = function deleteSecurityGroup() {
      var taskMonitor = {
        application: application,
        title: 'Deleting ' + securityGroup.name,
        forceRefreshMessage: 'Refreshing application...',
        forceRefreshEnabled: true
      };

      var submitMethod = function () {
        securityGroup.providerType = $scope.securityGroup.type;
        return securityGroupWriter.deleteSecurityGroup($scope.securityGroup, application, {vpcId: $scope.securityGroup.vpcId});
      };

      confirmationModalService.confirm({
        header: 'Really delete ' + securityGroup.name + '?',
        buttonText: 'Delete ' + securityGroup.name,
        destructive: true,
        provider: 'aws',
        account: securityGroup.accountId,
        applicationName: application.name,
        taskMonitorConfig: taskMonitor,
        submitMethod: submitMethod
      });
    };

  }
).name;