/**
 * Primary application target, defines top level module and imports required files.
 */

var angular = require('angular');

var appSettings = require('../build/app_settings');


var actionCenterMobile = angular.module('acm', ['ionic', 'ngCordova']);

/**
 * Captures application errors and pipes them to the server.
 *
 * EFF has a strict privacy policy that precludes using standard err reporting. To give us a shot
 * at acting on application errors, this handler captures any that bubble all the way up to window
 * and passes them to an error bus function to pipe them to the backend.
 */
actionCenterMobile.factory('$exceptionHandler', function($injector, $log) {

  var acmAPI;

  return function(exception, cause) {
    acmAPI = acmAPI || $injector.get('acmAPI');
    acmAPI.reportError(exception);
    $log.error(exception, cause);
  };

});

actionCenterMobile.controller('WelcomeCarouselCtrl', require('./controllers/welcome_carousel'));
actionCenterMobile.controller('ShareAppCtrl', require('./controllers/share_app'));
actionCenterMobile.controller('HomeCtrl', require('./controllers/home'));

actionCenterMobile.factory('acmUserDefaults', require('./services/user_defaults'));
actionCenterMobile.factory('acmAPI', require('./services/api'));
actionCenterMobile.factory('acmDeviceLanguage', require('./services/language'));
actionCenterMobile.factory('acmSharing', require('./services/sharing'));

actionCenterMobile.factory('acmPushNotification', require('./services/push'));
actionCenterMobile.factory('acmGCMPushNotification', require('./services/push/gcm'));
actionCenterMobile.factory('acmAPNSPushNotification', require('./services/push/apns'));
actionCenterMobile.factory('acmPushNotificationHelpers', require('./services/push/helpers'));

actionCenterMobile.config(function ($stateProvider) {

  var appStates = [

    {
      name: 'welcome',
      url: '/welcome',
      templateUrl: 'ng_partials/welcome/welcome_carousel.html',
      controller: 'WelcomeCarouselCtrl'
    },

    {
      name: 'post_intro',
      url: '/post_intro',
      templateUrl: 'ng_partials/post_intro.html',
      controller: 'ShareAppCtrl'
    },

    {
      name: 'share_app',
      url: '/share_app',
      templateUrl: 'ng_partials/post_intro.html',
      controller: 'ShareAppCtrl'
    },

    {
      name: 'home',
      url: '/home',
      templateUrl: 'ng_partials/home.html',
      controller: 'HomeCtrl'
    }

  ];

  for (var i = 0, len = appStates.length; i < len; i++) {
    $stateProvider.state(appStates[i]);
  }

  // NOTE: no otherwise is specified for routing, because:
  //  * the user shouldn't be able to get to any non-standard routes
  //  * it causes a load of the page by default prior to the routing logic in run() kicking in
});

actionCenterMobile.run(function(
  $rootScope, $state, $ionicViewService, $ionicPlatform, acmPushNotification, acmUserDefaults) {

  var registerForPush = function() {
    var platform = ionic.Platform.platform().toUpperCase();

    if (window.plugins !== undefined &&
        appSettings['APP']['PUSH_CAPABLE_PLATFORMS'].indexOf(platform) != -1) {
      acmPushNotification.register();
    }
  };

  $ionicPlatform.ready(function () {

    // Listen to the resume event - this is fired when the app re-enters the foreground
    // There's an edge case where a user gets a notification, but doesn't click it, where they're
    // not directed to the action page on app re-open.
    document.addEventListener('resume', function() {

      if (acmUserDefaults.hasReceivedAction() && $state.current.name !== 'home') {
        $state.go('home', {}, {location: 'replace'});
        var deregister = $rootScope.$on('$stateChangeSuccess', function() {
          $ionicViewService.clearHistory();
          deregister();
        });
      }

      if (!acmUserDefaults.getUserDefault(acmUserDefaults.REGISTERED_FOR_PUSH)) {
        registerForPush();
      }

      console.log(acmUserDefaults.getActionInfo());

    }, false);

    // Hide the accessory bar by default
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }

    // Requires org.apache.cordova.statusbar
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }

    registerForPush();

    // NOTE: this is delayed until post-ready as some plugins are not available otherwise (e.g.
    //       appAvailability) and cause problems if accessed.
    var completedWelcome = acmUserDefaults.getUserDefault(
      acmUserDefaults.keys.USER_HAS_COMPLETED_WELCOME);

    if (completedWelcome) {
      $state.go(acmUserDefaults.hasReceivedAction() ? 'home' : 'post_intro');
    } else {
      $state.go('welcome');
    }
  });
});

// Require in the cached templates - see gulp/tasks/ng_templates.js for details
require('../build/acmTemplates');
